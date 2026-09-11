export type EmailStatus = 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED';

export interface EmailJob {
  id: string;
  recipient: string;
  subject: string;
  scheduledAt: string;
  sentAt: string | null;
  status: EmailStatus;
  attempts: number;
  lastError: string | null;
  previewUrl: string | null;
  senderId: string | null;
  createdAt: string;
}

export interface EmailStats {
  scheduled: number;
  processing: number;
  sent: number;
  failed: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ScheduleEmailRequest {
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
  senderId?: string;
}

export interface ScheduleResult {
  scheduleId: string;
  totalJobs: number;
  startTime: string;
}

export interface Sender {
  id: string;
  email: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
