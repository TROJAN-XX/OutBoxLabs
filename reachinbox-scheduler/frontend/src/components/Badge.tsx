import React from 'react';
import { EmailStatus } from '../types/email';

interface BadgeProps {
  status: EmailStatus;
}

const statusStyles: Record<EmailStatus, { bg: string; text: string; label: string }> = {
  SCHEDULED: { bg: 'bg-scheduled-bg', text: 'text-scheduled-text', label: 'Scheduled' },
  PROCESSING: { bg: 'bg-processing-bg', text: 'text-processing-text', label: 'Processing' },
  SENT: { bg: 'bg-sent-bg', text: 'text-sent-text', label: 'Sent' },
  FAILED: { bg: 'bg-failed-bg', text: 'text-failed-text', label: 'Failed' },
};

export function Badge({ status }: BadgeProps) {
  const config = statusStyles[status] || statusStyles.SCHEDULED;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}
