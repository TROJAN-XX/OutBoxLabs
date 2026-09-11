import { Queue } from 'bullmq';
import { createRedisConnection } from '../config/redis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const EMAIL_QUEUE_NAME = 'email-delivery';

export interface EmailJobPayload {
  emailJobId: string;
  scheduleId: string;
  userId: string;
  senderId: string | null;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string; // ISO timestamp
  hourlyLimit: number;
  delayBetweenEmails: number;
}

let emailQueue: Queue<EmailJobPayload> | null = null;

export function getEmailQueue(): Queue<EmailJobPayload> {
  if (!emailQueue) {
    emailQueue = new Queue<EmailJobPayload>(EMAIL_QUEUE_NAME, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: env.EMAIL_RETRY_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: env.EMAIL_RETRY_BACKOFF_MS,
        },
        removeOnComplete: {
          count: 1000,
          age: 24 * 3600, // 24 hours
        },
        removeOnFail: {
          count: 5000,
          age: 7 * 24 * 3600, // 7 days
        },
      },
    });

    logger.info('[QUEUE] Email queue initialized');
  }

  return emailQueue;
}

/**
 * Adds a single delayed job to the queue with a deterministic job ID.
 * The job ID matches the EmailJob database record ID, ensuring idempotency.
 * If a job with this ID already exists in BullMQ, it will not be duplicated.
 */
export async function addDelayedEmailJob(
  payload: EmailJobPayload,
  delayMs: number
): Promise<string> {
  const queue = getEmailQueue();

  const job = await queue.add('send-email', payload, {
    jobId: payload.emailJobId, // Deterministic: same as DB record ID
    delay: Math.max(0, delayMs),
  });

  logger.info(
    `[QUEUE] Delayed job created: id=${job.id} recipient=${payload.recipient} delay=${delayMs}ms`
  );

  return job.id || payload.emailJobId;
}

/**
 * Bulk-adds delayed email jobs efficiently.
 * Each job has a deterministic ID preventing duplicates.
 */
export async function addBulkDelayedEmailJobs(
  jobs: Array<{ payload: EmailJobPayload; delayMs: number }>
): Promise<void> {
  const queue = getEmailQueue();

  const bulkJobs = jobs.map(({ payload, delayMs }) => ({
    name: 'send-email',
    data: payload,
    opts: {
      jobId: payload.emailJobId,
      delay: Math.max(0, delayMs),
    },
  }));

  await queue.addBulk(bulkJobs);

  logger.info(`[QUEUE] Bulk added ${bulkJobs.length} delayed jobs`);
}

/**
 * Reschedule a job to a new time by removing and re-adding it.
 * Used when rate limits are hit and the job needs to move to the next hour window.
 */
export async function rescheduleEmailJob(
  payload: EmailJobPayload,
  newDelayMs: number
): Promise<void> {
  const queue = getEmailQueue();

  // Remove existing job if present
  const existingJob = await queue.getJob(payload.emailJobId);
  if (existingJob) {
    await existingJob.remove();
  }

  // Re-add with new delay
  await queue.add('send-email', payload, {
    jobId: payload.emailJobId,
    delay: Math.max(0, newDelayMs),
  });

  logger.info(
    `[QUEUE] Rescheduled job: id=${payload.emailJobId} newDelay=${newDelayMs}ms`
  );
}

export async function closeEmailQueue(): Promise<void> {
  if (emailQueue) {
    await emailQueue.close();
    emailQueue = null;
    logger.info('[QUEUE] Email queue closed');
  }
}
