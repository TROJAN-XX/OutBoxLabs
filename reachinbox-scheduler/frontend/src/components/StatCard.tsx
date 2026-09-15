import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  color: 'primary' | 'warning' | 'success' | 'error';
  loading?: boolean;
}

const colorStyles: Record<string, { bg: string; iconColor: string; valueBg: string }> = {
  primary: { bg: 'bg-primary-light', iconColor: 'text-primary', valueBg: 'bg-primary-light' },
  warning: { bg: 'bg-warning-light', iconColor: 'text-warning', valueBg: 'bg-warning-light' },
  success: { bg: 'bg-success-light', iconColor: 'text-success', valueBg: 'bg-success-light' },
  error: { bg: 'bg-error-light', iconColor: 'text-error', valueBg: 'bg-error-light' },
};

export function StatCard({ label, value, icon: Icon, color, loading }: StatCardProps) {
  const styles = colorStyles[color];

  if (loading) {
    return (
      <div className="bg-white rounded-card border border-border shadow-card p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="skeleton h-4 w-20" />
            <div className="skeleton h-8 w-12" />
          </div>
          <div className="skeleton h-10 w-10 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-card border border-border shadow-card p-5 hover:shadow-card-hover transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-secondary font-medium">{label}</p>
          <p className="text-2xl font-bold text-text-primary mt-1">
            {value.toLocaleString()}
          </p>
        </div>
        <div className={`p-2.5 rounded-lg ${styles.bg}`}>
          <Icon className={`w-5 h-5 ${styles.iconColor}`} />
        </div>
      </div>
    </div>
  );
}
