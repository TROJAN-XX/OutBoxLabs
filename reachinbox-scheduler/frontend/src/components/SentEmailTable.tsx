import React, { useState } from 'react';
import { Send, Mail as MailIcon, ExternalLink, Eye } from 'lucide-react';
import { EmailJob } from '../types/email';
import { Badge } from './Badge';
import { EmptyState } from './EmptyState';
import { TableSkeleton } from './LoadingSkeleton';
import { Modal } from './Modal';

interface SentEmailTableProps {
  items: EmailJob[];
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SentEmailTable({
  items,
  loading,
  error,
  page,
  totalPages,
  total,
  onPageChange,
}: SentEmailTableProps) {
  const [selectedJob, setSelectedJob] = useState<EmailJob | null>(null);

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
        <p className="text-error font-medium">Unable to load sent emails</p>
        <p className="text-sm text-text-secondary mt-1">{error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-card border border-border shadow-card">
        <EmptyState
          icon={Send}
          title="No emails have been sent yet"
          description="Sent emails will appear here after your scheduled jobs are processed by the worker."
        />
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-card border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" aria-label="Sent emails">
            <thead>
              <tr className="border-b border-border bg-gray-50/60">
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Recipient
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Subject
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Sent Time
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
                      {formatDate(job.sentAt)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge status={job.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {job.previewUrl && (
                        <a
                          href={job.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-hover font-medium focus-ring rounded"
                          title="View Ethereal preview"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Preview
                        </a>
                      )}
                      {job.status === 'FAILED' && (
                        <button
                          onClick={() => setSelectedJob(job)}
                          className="inline-flex items-center gap-1 text-xs text-error hover:text-error-dark font-medium focus-ring rounded"
                          title="View error details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Details
                        </button>
                      )}
                    </div>
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
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of{' '}
              {total}
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

      {/* Error details modal */}
      <Modal
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        title="Email Delivery Error"
      >
        {selectedJob && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-text-secondary">Recipient</p>
              <p className="text-sm text-text-primary">{selectedJob.recipient}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">Subject</p>
              <p className="text-sm text-text-primary">{selectedJob.subject}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">Attempts</p>
              <p className="text-sm text-text-primary">{selectedJob.attempts}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">Error</p>
              <p className="text-sm text-error bg-error-light p-3 rounded-btn mt-1">
                {selectedJob.lastError || 'No error details available'}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
