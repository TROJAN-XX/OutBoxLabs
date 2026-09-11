import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { scheduleEmails } from '../services/schedulerService';
import {
  getScheduledEmails,
  getSentEmails,
  getEmailById,
  cancelEmailJob,
  getEmailStats,
  getUserSenders,
} from '../services/emailService';
import { scheduleEmailSchema, paginationSchema } from '../schemas/emailSchema';
import { ValidationError } from '../utils/errors';

export async function scheduleEmail(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = scheduleEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      const messages = parsed.error.errors.map(
        (e) => `${e.path.join('.')}: ${e.message}`
      );
      throw new ValidationError(messages.join('; '));
    }

    const result = await scheduleEmails(req.userId!, parsed.data);

    res.status(201).json({
      success: true,
      data: result,
      message: `${result.totalJobs} emails scheduled successfully`,
    });
  } catch (error) {
    next(error);
  }
}

export async function getScheduled(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const pagination = paginationSchema.parse(req.query);
    const result = await getScheduledEmails(
      req.userId!,
      pagination.page,
      pagination.limit
    );

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getSent(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const pagination = paginationSchema.parse(req.query);
    const result = await getSentEmails(
      req.userId!,
      pagination.page,
      pagination.limit
    );

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getEmail(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const job = await getEmailById(req.userId!, req.params.id);
    res.json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
}

export async function cancelEmail(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const job = await cancelEmailJob(req.userId!, req.params.id);
    res.json({
      success: true,
      data: job,
      message: 'Email cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function getStats(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const stats = await getEmailStats(req.userId!);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
}

export async function getSenders(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const senders = await getUserSenders(req.userId!);
    res.json({ success: true, data: senders });
  } catch (error) {
    next(error);
  }
}
