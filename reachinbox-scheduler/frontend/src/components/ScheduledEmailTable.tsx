import React, { useState } from 'react';
import { Clock, Mail as MailIcon, XCircle } from 'lucide-react';
import { EmailJob } from '../types/email';
import { Badge } from './Badge';
import { EmptyState } from './EmptyState';
import { TableSkeleton } from './LoadingSkeleton';
import { cancelEmail } from '../services/emailService';
import { useToast } from './Toast';

interface ScheduledEmailTableProps {
  items: EmailJob[];
  loading: boolean;
  error: string | null;
  onCompose?: () => void;
  onRefresh?: () => void;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ScheduledEmailTable({
  items,
  loading,
  error,
  onCompose,
  onRefresh,
  page,
  totalPages,
  total,
  onPageChange,
}: ScheduledEmailTableProps) {
  const toast = useToast();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancel = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this scheduled email?')) {
      return;
    }

    setCancellingId(id);
    try {
      await cancelEmail(id);
      toast.success('Scheduled email cancelled');
      onRefresh?.();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to cancel email';
      toast.error(message);
    } finally {
      setCancellingId(null);
    }
  };
  if (loading) {
    return (
      <div className="bg-white rounded-card border border-border shadow-card">
        <TableSkeleton rows={5} columns={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-card border border-border shadow-card p-8 text-center">
        <p className="text-error font-medium">Unable to load scheduled emails</p>
        <p className="text-sm text-text-secondary mt-1">{error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-card border border-border shadow-card">
        <EmptyState
          icon={Clock}
          title="No emails are scheduled yet"
          description="Create a campaign to start scheduling emails. Your queued emails will appear here."
          actionLabel="Compose New Email"
          onAction={onCompose}
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-card border border-border shadow-card overflow-hidden">
      {/* Desktop Table */}
      <div className="overflow-x-auto">
        <table className="w-full" aria-label="Scheduled emails">
          <thead>
            <tr className="border-b border-border bg-gray-50/60">
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Recipient
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Subject
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Scheduled Time
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {items.map((job) => (
              <tr key={job.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <MailIcon className="w-4 h-4 text-text-muted flex-shrink-0" />
                    <span className="text-sm text-text-primary font-medium truncate max-w-[200px]">
                      {job.recipient}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-text-primary truncate max-w-[250px] block">
                    {job.subject}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-text-secondary">
                    {formatDate(job.scheduledAt)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge status={job.status} />
                </td>
                <td className="px-4 py-3">
                  {job.status === 'SCHEDULED' && (
                    <button
                      onClick={() => handleCancel(job.id)}
                      disabled={cancellingId === job.id}
                      className="inline-flex items-center gap-1 text-xs text-error hover:text-error-dark font-medium px-2 py-1 rounded border border-error-light hover:bg-error-light/50 transition-colors disabled:opacity-50"
                      title="Cancel this scheduled email"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      {cancellingId === job.id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-sm text-text-secondary">
            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1 text-sm rounded-btn border border-border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-ring"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 text-sm rounded-btn border border-border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-ring"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
