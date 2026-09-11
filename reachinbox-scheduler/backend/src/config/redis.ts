import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

let redisConnection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!redisConnection) {
    redisConnection = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      retryStrategy: (times: number) => {
        if (times > 10) {
          logger.error('[REDIS] Max reconnection attempts reached');
          return null;
        }
        const delay = Math.min(times * 200, 5000);
        logger.warn(`[REDIS] Reconnecting in ${delay}ms (attempt ${times})`);
        return delay;
      },
    });

    redisConnection.on('connect', () => {
      logger.info('[REDIS] Connected successfully');
    });

    redisConnection.on('error', (err) => {
      logger.error('[REDIS] Connection error:', err.message);
    });

    redisConnection.on('close', () => {
      logger.warn('[REDIS] Connection closed');
    });
  }

  return redisConnection;
}

export function createRedisConnection(): Redis {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });
}

export async function disconnectRedis(): Promise<void> {
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
    logger.info('[REDIS] Disconnected');
  }
}

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const redis = getRedisConnection();
    const result = await redis.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}
