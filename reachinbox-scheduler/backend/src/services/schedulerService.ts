import { prisma } from '../config/database';
import { addBulkDelayedEmailJobs, EmailJobPayload } from '../queues/emailQueue';
import { ScheduleEmailInput } from '../schemas/emailSchema';
import { SchedulingError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

interface ScheduleResult {
  scheduleId: string;
  totalJobs: number;
  startTime: string;
}

/**
 * Core scheduling service.
 * 
 * Transactional design:
 * 1. Validate the request (start time in future, valid recipients).
 * 2. Create EmailSchedule + EmailJob records in a DB transaction.
 * 3. After DB commit, enqueue BullMQ jobs with deterministic IDs.
 * 4. If BullMQ enqueue fails, the DB records still exist (scheduled status)
 *    and can be recovered/retried. The jobs are NOT lost.
 */
export async function scheduleEmails(
  userId: string,
  input: ScheduleEmailInput
): Promise<ScheduleResult> {
  const {
    subject,
    body,
    recipients,
    startTime: startTimeStr,
    delayBetweenEmails,
    hourlyLimit,
    senderId,
  } = input;

  const startTime = new Date(startTimeStr);
  const now = new Date();

  // Reject past start times
  if (startTime.getTime() <= now.getTime()) {
    throw new ValidationError('Start time must be in the future');
  }

  // Deduplicate and normalize recipients
  const normalizedRecipients = [...new Set(
    recipients.map((r) => r.trim().toLowerCase())
  )];

  if (normalizedRecipients.length === 0) {
    throw new ValidationError('No valid recipients after deduplication');
  }

  // Resolve sender — use specified or pick user's default sender
  let resolvedSenderId: string | null = null;
  if (senderId) {
    const sender = await prisma.sender.findFirst({
      where: { id: senderId, userId },
    });
    if (!sender) {
      throw new ValidationError('Specified sender not found or does not belong to you');
    }
    resolvedSenderId = sender.id;
  } else {
    const defaultSender = await prisma.sender.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    resolvedSenderId = defaultSender?.id ?? null;
  }

  logger.info(
    `[SCHEDULER] Creating schedule: ${normalizedRecipients.length} recipients, ` +
    `start=${startTimeStr}, delay=${delayBetweenEmails}ms, limit=${hourlyLimit}/hr`
  );

  // Step 1: Create DB records in a transaction
  const { schedule, emailJobs } = await prisma.$transaction(async (tx) => {
    const schedule = await tx.emailSchedule.create({
      data: {
        userId,
        subject,
        body,
        startTime,
        delayBetweenEmails,
        hourlyLimit,
        recipientCount: normalizedRecipients.length,
      },
    });

    // Calculate individual send times with staggered delays
    const jobRecords = normalizedRecipients.map((recipient, index) => {
      const scheduledAtMs = startTime.getTime() + index * delayBetweenEmails;
      return {
        scheduleId: schedule.id,
        userId,
        senderId: resolvedSenderId,
        recipient,
        subject,
        body,
        scheduledAt: new Date(scheduledAtMs),
        status: 'SCHEDULED' as const,
        bullJobId: null as string | null,
      };
    });

    const emailJobs = await tx.emailJob.createManyAndReturn({
      data: jobRecords,
    });

    logger.info(`[DB] Created schedule ${schedule.id} with ${emailJobs.length} jobs`);

    return { schedule, emailJobs };
  });

  // Step 2: Enqueue BullMQ jobs after DB commit
  // Uses deterministic job IDs (emailJob.id) to prevent duplicates
  try {
    const bulkJobs: Array<{ payload: EmailJobPayload; delayMs: number }> = [];

    for (const job of emailJobs) {
      const delayMs = Math.max(0, job.scheduledAt.getTime() - Date.now());

      bulkJobs.push({
        payload: {
          emailJobId: job.id,
          scheduleId: schedule.id,
          userId,
          senderId: resolvedSenderId,
          recipient: job.recipient,
          subject: job.subject,
          body: job.body,
          scheduledAt: job.scheduledAt.toISOString(),
          hourlyLimit,
          delayBetweenEmails,
        },
        delayMs,
      });
    }

    await addBulkDelayedEmailJobs(bulkJobs);

    // Update EmailJob records with their BullMQ job IDs (same as emailJob.id)
    await prisma.emailJob.updateMany({
      where: { scheduleId: schedule.id },
      data: { bullJobId: undefined }, // bullJobId = emailJob.id, set via individual updates
    });

    // Set bullJobId for each job individually (deterministic: same as db ID)
    for (const job of emailJobs) {
      await prisma.emailJob.update({
        where: { id: job.id },
        data: { bullJobId: job.id },
      });
    }

    logger.info(`[QUEUE] Enqueued ${bulkJobs.length} delayed jobs for schedule ${schedule.id}`);
  } catch (error) {
    // DB records exist but queue failed — surface clearly
    logger.error(
      `[SCHEDULER] BullMQ enqueue failed for schedule ${schedule.id}:`,
      error
    );
    throw new SchedulingError(
      'Email jobs were saved but queue insertion failed. ' +
      'Jobs can be recovered. Please retry or contact support.'
    );
  }

  return {
    scheduleId: schedule.id,
    totalJobs: emailJobs.length,
    startTime: startTime.toISOString(),
  };
}
