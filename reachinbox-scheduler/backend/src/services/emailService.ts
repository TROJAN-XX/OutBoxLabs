import { EmailJobStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { NotFoundError } from '../utils/errors';

interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function getScheduledEmails(
  userId: string,
  page: number,
  limit: number
): Promise<PaginatedResult<Record<string, unknown>>> {
  const where = {
    userId,
    status: { in: [EmailJobStatus.SCHEDULED, EmailJobStatus.PROCESSING] },
  };

  const [items, total] = await Promise.all([
    prisma.emailJob.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        recipient: true,
        subject: true,
        scheduledAt: true,
        status: true,
        attempts: true,
        senderId: true,
        createdAt: true,
      },
    }),
    prisma.emailJob.count({ where }),
  ]);

  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getSentEmails(
  userId: string,
  page: number,
  limit: number
): Promise<PaginatedResult<Record<string, unknown>>> {
  const where = {
    userId,
    status: { in: [EmailJobStatus.SENT, EmailJobStatus.FAILED] },
  };

  const [items, total] = await Promise.all([
    prisma.emailJob.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        recipient: true,
        subject: true,
        scheduledAt: true,
        sentAt: true,
        status: true,
        attempts: true,
        lastError: true,
        previewUrl: true,
        senderId: true,
        createdAt: true,
      },
    }),
    prisma.emailJob.count({ where }),
  ]);

  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getEmailById(userId: string, emailId: string) {
  const job = await prisma.emailJob.findFirst({
    where: { id: emailId, userId },
    include: {
      schedule: {
        select: {
          id: true,
          subject: true,
          startTime: true,
          delayBetweenEmails: true,
          hourlyLimit: true,
        },
      },
      sender: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  if (!job) {
    throw new NotFoundError('Email job not found');
  }

  return job;
}

export async function cancelEmailJob(userId: string, emailId: string) {
  const job = await prisma.emailJob.findFirst({
    where: { id: emailId, userId },
  });

  if (!job) {
    throw new NotFoundError('Email job not found');
  }

  if (job.status !== EmailJobStatus.SCHEDULED) {
    throw new NotFoundError('Only scheduled emails can be cancelled');
  }

  const updated = await prisma.emailJob.update({
    where: { id: emailId },
    data: { status: EmailJobStatus.FAILED, lastError: 'Cancelled by user' },
  });

  return updated;
}

export async function getEmailStats(userId: string) {
  const [scheduled, processing, sent, failed] = await Promise.all([
    prisma.emailJob.count({ where: { userId, status: EmailJobStatus.SCHEDULED } }),
    prisma.emailJob.count({ where: { userId, status: EmailJobStatus.PROCESSING } }),
    prisma.emailJob.count({ where: { userId, status: EmailJobStatus.SENT } }),
    prisma.emailJob.count({ where: { userId, status: EmailJobStatus.FAILED } }),
  ]);

  return { scheduled, processing, sent, failed };
}

export async function getUserSenders(userId: string) {
  return prisma.sender.findMany({
    where: { userId },
    select: {
      id: true,
      email: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });
}
