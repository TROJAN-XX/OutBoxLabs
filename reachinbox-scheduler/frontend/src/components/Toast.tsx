import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  exiting?: boolean;
}

interface ToastContextValue {
  addToast: (type: ToastType, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const typeConfig: Record<ToastType, { icon: typeof CheckCircle; bg: string; border: string; text: string }> = {
  success: { icon: CheckCircle, bg: 'bg-success-light', border: 'border-success', text: 'text-success-dark' },
  error: { icon: AlertCircle, bg: 'bg-error-light', border: 'border-error', text: 'text-error-dark' },
  warning: { icon: AlertTriangle, bg: 'bg-warning-light', border: 'border-warning', text: 'text-warning-dark' },
  info: { icon: Info, bg: 'bg-primary-light', border: 'border-primary', text: 'text-primary-dark' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 200);
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => removeToast(id), 5000);
    },
    [removeToast]
  );

  const contextValue: ToastContextValue = {
    addToast,
    success: (msg) => addToast('success', msg),
    error: (msg) => addToast('error', msg),
    warning: (msg) => addToast('warning', msg),
    info: (msg) => addToast('info', msg),
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm" role="status" aria-live="polite">
        {toasts.map((toast) => {
          const config = typeConfig[toast.type];
          const Icon = config.icon;
          return (
            <div
              key={toast.id}
              className={`${toast.exiting ? 'toast-exit' : 'toast-enter'} 
                flex items-start gap-3 px-4 py-3 rounded-card border ${config.bg} ${config.border} shadow-card`}
            >
              <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.text}`} />
              <p className={`text-sm font-medium flex-1 ${config.text}`}>{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className={`flex-shrink-0 ${config.text} hover:opacity-70 focus-ring rounded`}
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
