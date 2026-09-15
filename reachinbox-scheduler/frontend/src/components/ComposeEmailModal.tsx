import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { Modal } from './Modal';
import { Input } from './Input';
import { Textarea } from './Textarea';
import { Button } from './Button';
import { FileUploader } from './FileUploader';
import { useToast } from './Toast';
import { scheduleEmails } from '../services/emailService';

interface ComposeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ComposeEmailModal({
  isOpen,
  onClose,
  onSuccess,
}: ComposeEmailModalProps) {
  const toast = useToast();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('');
  const [delayBetweenEmails, setDelayBetweenEmails] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(100);
  const [submitting, setSubmitting] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get minimum datetime (1 minute from now, in local format for input)
  function getMinDateTime(): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    // Format as YYYY-MM-DDTHH:mm for datetime-local input
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!subject.trim()) newErrors.subject = 'Subject is required';
    if (!body.trim()) newErrors.body = 'Email body is required';
    if (recipients.length === 0) newErrors.recipients = 'Upload a CSV with at least one recipient';
    if (!startTime) {
      newErrors.startTime = 'Start time is required';
    } else {
      const selectedDate = new Date(startTime);
      if (selectedDate.getTime() <= Date.now()) {
        newErrors.startTime = 'Start time must be in the future';
      }
    }
    if (delayBetweenEmails < 0.1) newErrors.delay = 'Delay must be at least 0.1 seconds';
    if (hourlyLimit < 1) newErrors.hourlyLimit = 'Hourly limit must be at least 1';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    setSubmitting(true);
    try {
      // Convert local datetime to ISO UTC string
      const isoStartTime = new Date(startTime).toISOString();

      const result = await scheduleEmails({
        subject: subject.trim(),
        body: body.trim(),
        recipients,
        startTime: isoStartTime,
        delayBetweenEmails: Math.round(delayBetweenEmails * 1000), // Convert seconds to ms
        hourlyLimit,
      });

      toast.success(
        `${result.totalJobs} email${result.totalJobs !== 1 ? 's' : ''} scheduled successfully`
      );

      // Reset form
      setSubject('');
      setBody('');
      setRecipients([]);
      setStartTime('');
      setDelayBetweenEmails(2);
      setHourlyLimit(100);
      setErrors({});

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to schedule emails. Please try again.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  const isFormValid =
    subject.trim() &&
    body.trim() &&
    recipients.length > 0 &&
    startTime &&
    delayBetweenEmails >= 0.1 &&
    hourlyLimit >= 1;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Compose New Email" maxWidth="max-w-2xl">
      <div className="space-y-6">
        {/* Section 1: Email Content */}
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-3 uppercase tracking-wide">
            Email Content
          </h3>
          <div className="space-y-4">
            <Input
              label="Subject"
              placeholder="Enter email subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              error={errors.subject}
              id="compose-subject"
            />
            <Textarea
              label="Body"
              placeholder="Write your email content here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              error={errors.body}
              rows={5}
              id="compose-body"
            />
          </div>
        </div>

        {/* Section 2: Recipients */}
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-3 uppercase tracking-wide">
            Recipients
          </h3>
          <FileUploader onEmailsExtracted={setRecipients} />
          {errors.recipients && (
            <p className="text-xs text-error mt-1">{errors.recipients}</p>
          )}
        </div>

        {/* Section 3: Schedule */}
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-3 uppercase tracking-wide">
            Schedule Settings
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Start Time"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              min={getMinDateTime()}
              error={errors.startTime}
              id="compose-start-time"
            />
            <Input
              label="Delay (seconds)"
              type="number"
              value={delayBetweenEmails}
              onChange={(e) => setDelayBetweenEmails(parseFloat(e.target.value) || 0)}
              min={0.1}
              step={0.1}
              error={errors.delay}
              helpText="Between each email"
              id="compose-delay"
            />
            <Input
              label="Hourly Limit"
              type="number"
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(parseInt(e.target.value) || 0)}
              min={1}
              max={10000}
              error={errors.hourlyLimit}
              helpText="Max per sender/hour"
              id="compose-hourly-limit"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={submitting}
            disabled={!isFormValid || submitting}
          >
            <Send className="w-4 h-4 mr-2" />
            {submitting ? 'Scheduling...' : `Schedule ${recipients.length > 0 ? recipients.length : ''} Email${recipients.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
