import { getRedisConnection } from '../config/redis';
import { logger } from '../utils/logger';

/**
 * Redis-backed distributed rate limiter using Lua scripts for atomicity.
 * 
 * Each sender has an hourly rate-limit counter keyed by:
 *   email-rate:{senderId}:{YYYY-MM-DD-HH}
 * 
 * The Lua script atomically checks the current count, increments if below limit,
 * and sets a TTL on the key. This prevents race conditions where multiple workers
 * simultaneously believe they are below the limit.
 */

// Lua script for atomic rate limit check + increment
// Returns: 1 if allowed (and incremented), 0 if rate limited
const RATE_LIMIT_LUA = `
  local key = KEYS[1]
  local limit = tonumber(ARGV[1])
  local ttl = tonumber(ARGV[2])
  
  local current = tonumber(redis.call('GET', key) or '0')
  if current >= limit then
    return 0
  end
  
  local newCount = redis.call('INCR', key)
  if newCount == 1 then
    redis.call('EXPIRE', key, ttl)
  end
  
  return 1
`;

// Lua script to get current count without incrementing
const GET_COUNT_LUA = `
  local key = KEYS[1]
  return tonumber(redis.call('GET', key) or '0')
`;

function getHourWindow(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  return `${year}-${month}-${day}-${hour}`;
}

function getRateLimitKey(senderId: string, hourWindow: string): string {
  return `email-rate:${senderId}:${hourWindow}`;
}

/**
 * Attempts to acquire a rate-limit token for the given sender in the current hour.
 * Returns true if the email is allowed, false if the hourly limit has been reached.
 * The check-and-increment is atomic via Lua script.
 */
export async function tryAcquireRateSlot(
  senderId: string,
  hourlyLimit: number,
  timestamp?: Date
): Promise<boolean> {
  const redis = getRedisConnection();
  const now = timestamp || new Date();
  const hourWindow = getHourWindow(now);
  const key = getRateLimitKey(senderId, hourWindow);

  // TTL of 2 hours ensures the key expires well after the hour window closes
  const ttlSeconds = 7200;

  const result = await redis.eval(RATE_LIMIT_LUA, 1, key, hourlyLimit, ttlSeconds);

  if (result === 1) {
    logger.debug(`[RATE] Allowed: sender=${senderId} window=${hourWindow}`);
    return true;
  }

  logger.info(`[RATE] Limit reached: sender=${senderId} window=${hourWindow} limit=${hourlyLimit}`);
  return false;
}

/**
 * Gets the current send count for a sender in a given hour window.
 */
export async function getCurrentHourCount(
  senderId: string,
  timestamp?: Date
): Promise<number> {
  const redis = getRedisConnection();
  const now = timestamp || new Date();
  const hourWindow = getHourWindow(now);
  const key = getRateLimitKey(senderId, hourWindow);

  const result = await redis.eval(GET_COUNT_LUA, 1, key);
  return typeof result === 'number' ? result : 0;
}

/**
 * Calculates the start of the next hour window from the given timestamp.
 * Used to reschedule jobs that hit the rate limit.
 */
export function getNextHourWindowStart(timestamp?: Date): Date {
  const now = timestamp || new Date();
  const next = new Date(now);
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(next.getUTCHours() + 1);
  return next;
}

/**
 * Sender-level delay enforcement using Redis.
 * Ensures minimum delay between emails from the same sender across all workers.
 * 
 * Key: sender-last-send:{senderId}
 * Value: timestamp (ms) of last send
 * 
 * Returns the number of milliseconds to wait, or 0 if no wait is needed.
 */
const SENDER_THROTTLE_LUA = `
  local key = KEYS[1]
  local minDelayMs = tonumber(ARGV[1])
  local nowMs = tonumber(ARGV[2])
  
  local lastSendMs = tonumber(redis.call('GET', key) or '0')
  local elapsed = nowMs - lastSendMs
  
  if elapsed >= minDelayMs then
    redis.call('SET', key, tostring(nowMs))
    redis.call('EXPIRE', key, 60)
    return 0
  end
  
  return minDelayMs - elapsed
`;

/**
 * Atomically checks and enforces sender-level throttling.
 * Returns 0 if the send can proceed immediately, or the number of ms to wait.
 */
export async function acquireSenderThrottle(
  senderId: string,
  minDelayMs: number
): Promise<number> {
  const redis = getRedisConnection();
  const key = `sender-last-send:${senderId}`;
  const nowMs = Date.now();

  const waitMs = await redis.eval(SENDER_THROTTLE_LUA, 1, key, minDelayMs, nowMs);
  return typeof waitMs === 'number' ? waitMs : 0;
}
