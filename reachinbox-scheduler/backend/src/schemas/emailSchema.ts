import { z } from 'zod';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const scheduleEmailSchema = z.object({
  subject: z.string().min(1, 'Subject cannot be empty').max(500, 'Subject too long'),
  body: z.string().min(1, 'Email body cannot be empty').max(50000, 'Body too long'),
  recipients: z
    .array(z.string().regex(emailRegex, 'Invalid email address'))
    .min(1, 'At least one recipient is required')
    .max(10000, 'Maximum 10,000 recipients allowed'),
  startTime: z.string().datetime({ message: 'Start time must be a valid ISO 8601 datetime' }),
  delayBetweenEmails: z
    .number()
    .int()
    .min(100, 'Delay must be at least 100ms')
    .max(3600000, 'Delay cannot exceed 1 hour')
    .default(2000),
  hourlyLimit: z
    .number()
    .int()
    .min(1, 'Hourly limit must be at least 1')
    .max(10000, 'Hourly limit cannot exceed 10,000')
    .default(100),
  senderId: z.string().uuid().optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ScheduleEmailInput = z.infer<typeof scheduleEmailSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
