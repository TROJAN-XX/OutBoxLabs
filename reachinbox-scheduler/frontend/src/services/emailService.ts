import api from './api';
import {
  EmailJob,
  EmailStats,
  PaginatedResponse,
  ScheduleEmailRequest,
  ScheduleResult,
  Sender,
  ApiResponse,
} from '../types/email';

export async function scheduleEmails(
  request: ScheduleEmailRequest
): Promise<ScheduleResult> {
  const { data } = await api.post<ApiResponse<ScheduleResult>>(
    '/emails/schedule',
    request
  );
  return data.data;
}

export async function getScheduledEmails(
  page = 1,
  limit = 20
): Promise<PaginatedResponse<EmailJob>> {
  const { data } = await api.get<ApiResponse<PaginatedResponse<EmailJob>>>(
    '/emails/scheduled',
    { params: { page, limit } }
  );
  return data.data;
}

export async function getSentEmails(
  page = 1,
  limit = 20
): Promise<PaginatedResponse<EmailJob>> {
  const { data } = await api.get<ApiResponse<PaginatedResponse<EmailJob>>>(
    '/emails/sent',
    { params: { page, limit } }
  );
  return data.data;
}

export async function getEmailById(id: string): Promise<EmailJob> {
  const { data } = await api.get<ApiResponse<EmailJob>>(`/emails/${id}`);
  return data.data;
}

export async function cancelEmail(id: string): Promise<void> {
  await api.post(`/emails/${id}/cancel`);
}

export async function getEmailStats(): Promise<EmailStats> {
  const { data } = await api.get<ApiResponse<EmailStats>>('/emails/stats');
  return data.data;
}

export async function getSenders(): Promise<Sender[]> {
  const { data } = await api.get<ApiResponse<Sender[]>>('/emails/senders');
  return data.data;
}
