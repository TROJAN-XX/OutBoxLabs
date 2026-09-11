import { Worker, Job } from 'bullmq';
import { EmailJobStatus } from '@prisma/client';
import { createRedisConnection } from '../config/redis';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { EMAIL_QUEUE_NAME, EmailJobPayload, rescheduleEmailJob } from '../queues/emailQueue';
import { sendEmail, buildSenderCredentials, buildDefaultCredentials } from '../services/smtpService';
import {
  tryAcquireRateSlot,
  getNextHourWindowStart,
  acquireSenderThrottle,
} from '../services/rateLimitService';
import { logger } from '../utils/logger';

let emailWorker: Worker<EmailJobPayload> | null = null;

/**
 * Email Worker — BullMQ job processor
 * 
 * Flow for each job:
 * 1. Read EmailJob from PostgreSQL (source of truth).
 * 2. If already sent → skip (idempotency).
 * 3. Atomic claim: UPDATE ... WHERE status = 'SCHEDULED' → 'PROCESSING'.
 *    Only one worker can succeed at this transition.
 * 4. Check sender-level throttle (min delay between sends).
 *    If throttle active → reschedule via BullMQ delayed job.
 * 5. Check hourly rate limit (Redis atomic Lua).
 *    If limit hit → calculate next hour window, reschedule.
 * 6. Send email via Ethereal SMTP.
 * 7. Mark as SENT with sentAt and previewUrl.
 * 8. On SMTP failure → throw to trigger BullMQ retry.
 *    After max retries → mark as FAILED.
 */
async function processEmailJob(job: Job<EmailJobPayload>): Promise<void> {
  const { emailJobId, senderId, recipient, hourlyLimit, delayBetweenEmails } = job.data;

  logger.info(`[WORKER] Processing job: id=${emailJobId} recipient=${recipient}`);

  // Step 1: Read current state from DB
  const emailJob = await prisma.emailJob.findUnique({
    where: { id: emailJobId },
  });

  if (!emailJob) {
    logger.warn(`[WORKER] Job ${emailJobId} not found in DB, skipping`);
    return;
  }

  // Step 2: Idempotency — already sent
  if (emailJob.status === EmailJobStatus.SENT) {
    logger.info(`[WORKER] Job ${emailJobId} already sent, skipping (idempotent)`);
    return;
  }

  // Skip if already failed permanently
  if (emailJob.status === EmailJobStatus.FAILED) {
    logger.info(`[WORKER] Job ${emailJobId} already failed, skipping`);
    return;
  }

  // Step 3: Atomic claim — only one worker can transition SCHEDULED → PROCESSING
  // This uses a WHERE clause that acts as a compare-and-swap
  const claimResult = await prisma.emailJob.updateMany({
    where: {
      id: emailJobId,
      status: EmailJobStatus.SCHEDULED, // Only claim if still SCHEDULED
    },
    data: {
      status: EmailJobStatus.PROCESSING,
      attempts: { increment: 1 },
    },
  });

  // If the job is already PROCESSING (e.g., from a retry), allow it to proceed
  const isRetry = emailJob.status === EmailJobStatus.PROCESSING;

  if (claimResult.count === 0 && !isRetry) {
    logger.info(
      `[WORKER] Job ${emailJobId} already claimed by another worker, skipping`
    );
    return;
  }

  if (isRetry) {
    // Increment attempt counter for retries
    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: { attempts: { increment: 1 } },
    });
  }

  // Step 4: Sender throttle — enforce minimum delay between sends
  const effectiveSenderId = senderId || 'default';
  const effectiveDelay = delayBetweenEmails || env.MIN_EMAIL_DELAY_MS;

  const waitMs = await acquireSenderThrottle(effectiveSenderId, effectiveDelay);
  if (waitMs > 0) {
    logger.info(
      `[WORKER] Sender throttle active for ${effectiveSenderId}, rescheduling in ${waitMs}ms`
    );
    // Reschedule via BullMQ instead of sleeping
    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: { status: EmailJobStatus.SCHEDULED },
    });
    await rescheduleEmailJob(job.data, waitMs);
    return;
  }

  // Step 5: Hourly rate limit check (atomic Redis Lua)
  const rateAllowed = await tryAcquireRateSlot(
    effectiveSenderId,
    hourlyLimit || env.MAX_EMAILS_PER_HOUR
  );

  if (!rateAllowed) {
    // Calculate next available hour window and reschedule
    const nextWindow = getNextHourWindowStart();
    const rescheduleDelayMs = nextWindow.getTime() - Date.now();

    logger.info(
      `[WORKER] Rate limit reached for sender ${effectiveSenderId}, ` +
      `rescheduling job ${emailJobId} to ${nextWindow.toISOString()}`
    );

    // Revert status back to SCHEDULED for next attempt
    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: {
        status: EmailJobStatus.SCHEDULED,
        scheduledAt: nextWindow,
      },
    });

    await rescheduleEmailJob(
      { ...job.data, scheduledAt: nextWindow.toISOString() },
      rescheduleDelayMs
    );
    return;
  }

  // Step 6: Send email via SMTP
  try {
    // Resolve sender credentials
    let credentials;
    if (senderId) {
      const sender = await prisma.sender.findUnique({ where: { id: senderId } });
      if (sender) {
        credentials = buildSenderCredentials(sender);
      } else {
        credentials = buildDefaultCredentials();
      }
    } else {
      credentials = buildDefaultCredentials();
    }

    const senderEmail = credentials.user || 'noreply@reachinbox.dev';

    const result = await sendEmail({
      from: senderEmail,
      to: recipient,
      subject: emailJob.subject,
      body: emailJob.body,
      credentials,
    });

    // Step 7: Mark as SENT
    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: {
        status: EmailJobStatus.SENT,
        sentAt: new Date(),
        previewUrl: result.previewUrl,
      },
    });

    logger.info(`[WORKER] Job ${emailJobId} marked as SENT`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown SMTP error';

    logger.error(`[WORKER] SMTP failed for job ${emailJobId}: ${errorMessage}`);

    // Check if this is the final attempt
    const currentAttempts = (emailJob.attempts || 0) + 1;
    if (currentAttempts >= env.EMAIL_RETRY_ATTEMPTS) {
      // Final failure — mark as FAILED
      await prisma.emailJob.update({
        where: { id: emailJobId },
        data: {
          status: EmailJobStatus.FAILED,
          lastError: errorMessage,
        },
      });
      logger.error(`[WORKER] Job ${emailJobId} permanently FAILED after ${currentAttempts} attempts`);
      return; // Don't throw — we've handled the failure
    }

    // Update error info but keep as PROCESSING for BullMQ retry
    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: { lastError: errorMessage },
    });

    // Throw to trigger BullMQ's built-in retry with exponential backoff
    throw error;
  }
}

export function startEmailWorker(): Worker<EmailJobPayload> {
  if (emailWorker) return emailWorker;

  emailWorker = new Worker<EmailJobPayload>(
    EMAIL_QUEUE_NAME,
    processEmailJob,
    {
      connection: createRedisConnection(),
      concurrency: env.WORKER_CONCURRENCY,
      limiter: {
        max: env.MAX_EMAILS_PER_HOUR,
        duration: 3600000, // 1 hour in ms
      },
    }
  );

  emailWorker.on('completed', (job) => {
    logger.info(`[WORKER] Job completed: ${job.id}`);
  });

  emailWorker.on('failed', (job, error) => {
    logger.error(`[WORKER] Job failed: ${job?.id} — ${error.message}`);
  });

  emailWorker.on('error', (error) => {
    logger.error('[WORKER] Worker error:', error.message);
  });

  emailWorker.on('stalled', (jobId) => {
    logger.warn(`[WORKER] Job stalled: ${jobId}`);
  });

  logger.info(
    `[WORKER] Email worker started with concurrency=${env.WORKER_CONCURRENCY}`
  );

  return emailWorker;
}

export async function stopEmailWorker(): Promise<void> {
  if (emailWorker) {
    await emailWorker.close();
    emailWorker = null;
    logger.info('[WORKER] Email worker stopped');
  }
}
