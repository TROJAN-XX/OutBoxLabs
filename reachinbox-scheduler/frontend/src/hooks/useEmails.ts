import { useState, useEffect, useCallback } from 'react';
import {
  EmailJob,
  EmailStats,
  PaginatedResponse,
} from '../types/email';
import {
  getScheduledEmails,
  getSentEmails,
  getEmailStats,
} from '../services/emailService';

export function useEmailStats() {
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getEmailStats();
      setStats(data);
      setError(null);
    } catch (err) {
      setError('Failed to load email statistics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { stats, loading, error, refresh };
}

export function useScheduledEmails(page = 1, limit = 20) {
  const [data, setData] = useState<PaginatedResponse<EmailJob> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getScheduledEmails(page, limit);
      setData(result);
      setError(null);
    } catch (err) {
      setError('Failed to load scheduled emails');
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useSentEmails(page = 1, limit = 20) {
  const [data, setData] = useState<PaginatedResponse<EmailJob> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getSentEmails(page, limit);
      setData(result);
      setError(null);
    } catch (err) {
      setError('Failed to load sent emails');
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
