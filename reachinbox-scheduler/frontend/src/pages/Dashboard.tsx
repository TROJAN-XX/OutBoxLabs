import React, { useState, useCallback, useEffect } from 'react';
import { Plus, Clock, Loader, Send, AlertCircle, RefreshCw } from 'lucide-react';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { StatCard } from '../components/StatCard';
import { ScheduledEmailTable } from '../components/ScheduledEmailTable';
import { SentEmailTable } from '../components/SentEmailTable';
import { ComposeEmailModal } from '../components/ComposeEmailModal';
import { useEmailStats, useScheduledEmails, useSentEmails } from '../hooks/useEmails';

type TabId = 'scheduled' | 'sent';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('scheduled');
  const [composeOpen, setComposeOpen] = useState(false);
  const [scheduledPage, setScheduledPage] = useState(1);
  const [sentPage, setSentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { stats, loading: statsLoading, refresh: refreshStats } = useEmailStats();
  const {
    data: scheduledData,
    loading: scheduledLoading,
    error: scheduledError,
    refresh: refreshScheduled,
  } = useScheduledEmails(scheduledPage);
  const {
    data: sentData,
    loading: sentLoading,
    error: sentError,
    refresh: refreshSent,
  } = useSentEmails(sentPage);

  const handleScheduleSuccess = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refreshStats(), refreshScheduled(), refreshSent()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshStats, refreshScheduled, refreshSent]);

  // Auto-refresh when jobs are active (scheduled or processing)
  useEffect(() => {
    const hasActiveJobs =
      (stats?.scheduled && stats.scheduled > 0) ||
      (stats?.processing && stats.processing > 0);

    const intervalTime = hasActiveJobs ? 5000 : 15000;
    const interval = setInterval(() => {
      handleScheduleSuccess();
    }, intervalTime);

    return () => clearInterval(interval);
  }, [stats?.scheduled, stats?.processing, handleScheduleSuccess]);

  const tabs: { id: TabId; label: string }[] = [
    { id: 'scheduled', label: 'Scheduled Emails' },
    { id: 'sent', label: 'Sent Emails' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Email Scheduler
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Schedule, monitor, and manage your outbound emails with precision
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleScheduleSuccess}
              disabled={isRefreshing}
              className="p-2 text-text-secondary hover:text-text-primary rounded-btn border border-border bg-white hover:bg-gray-50 transition-colors focus-ring"
              title="Refresh lists"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`}
              />
            </button>
            <Button onClick={() => setComposeOpen(true)} size="md">
              <Plus className="w-4 h-4 mr-2" />
              Compose New Email
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Scheduled"
            value={stats?.scheduled ?? 0}
            icon={Clock}
            color="primary"
            loading={statsLoading}
          />
          <StatCard
            label="Processing"
            value={stats?.processing ?? 0}
            icon={Loader}
            color="warning"
            loading={statsLoading}
          />
          <StatCard
            label="Sent"
            value={stats?.sent ?? 0}
            icon={Send}
            color="success"
            loading={statsLoading}
          />
          <StatCard
            label="Failed"
            value={stats?.failed ?? 0}
            icon={AlertCircle}
            color="error"
            loading={statsLoading}
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors focus-ring rounded-t ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'scheduled' && (
          <ScheduledEmailTable
            items={scheduledData?.items ?? []}
            loading={scheduledLoading}
            error={scheduledError}
            onCompose={() => setComposeOpen(true)}
            onRefresh={handleScheduleSuccess}
            page={scheduledPage}
            totalPages={scheduledData?.totalPages ?? 1}
            total={scheduledData?.total ?? 0}
            onPageChange={setScheduledPage}
          />
        )}

        {activeTab === 'sent' && (
          <SentEmailTable
            items={sentData?.items ?? []}
            loading={sentLoading}
            error={sentError}
            page={sentPage}
            totalPages={sentData?.totalPages ?? 1}
            total={sentData?.total ?? 0}
            onPageChange={setSentPage}
          />
        )}
      </main>

      {/* Compose Modal */}
      <ComposeEmailModal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSuccess={handleScheduleSuccess}
      />
    </div>
  );
}
