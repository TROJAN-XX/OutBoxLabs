import React, { useEffect, useRef } from 'react';
import { Mail } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            config: {
              theme?: string;
              size?: string;
              text?: string;
              width?: number;
              shape?: string;
            }
          ) => void;
        };
      };
    };
  }
}

export function Login() {
  const { login, loginWithDemo, authenticated, loading } = useAuth();
  const navigate = useNavigate();
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [loginLoading, setLoginLoading] = React.useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Redirect if already authenticated
  useEffect(() => {
    if (authenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [authenticated, navigate]);

  const handleDemoLogin = async () => {
    setLoginLoading(true);
    try {
      await loginWithDemo();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Demo login failed:', err);
    } finally {
      setLoginLoading(false);
    }
  };

  // Initialize Google Sign-In
  useEffect(() => {
    if (!clientId) {
      return;
    }

    const initializeGoogle = () => {
      if (window.google && googleBtnRef.current) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: { credential: string }) => {
            setLoginLoading(true);
            try {
              await login(response.credential);
              navigate('/dashboard', { replace: true });
            } catch (err) {
              console.error('Login failed:', err);
              setLoginLoading(false);
            }
          },
        });

        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          width: 320,
          shape: 'rectangular',
        });
      }
    };

    if (window.google) {
      initializeGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google) {
          clearInterval(interval);
          initializeGoogle();
        }
      }, 100);
      setTimeout(() => clearInterval(interval), 10000);
    }
  }, [clientId, login, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-xl shadow-card border border-border p-8 sm:p-10">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="p-3 bg-primary rounded-xl mb-4 shadow-sm">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary">
              ReachInbox Scheduler
            </h1>
            <p className="text-sm text-text-secondary mt-2 text-center max-w-xs">
              Schedule, monitor, and manage your outbound email campaigns with
              precision timing and intelligent rate limiting.
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-border my-6" />

          {/* Google Sign-In & Demo Sign-In */}
          <div className="flex flex-col items-center gap-4 w-full">
            {loginLoading ? (
              <div className="flex items-center gap-3 py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
                <span className="text-sm text-text-secondary">
                  Signing you in...
                </span>
              </div>
            ) : (
              <>
                {clientId && (
                  <>
                    <div ref={googleBtnRef} className="flex justify-center w-full" />
                    <div className="relative w-full my-2">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-text-muted">or</span>
                      </div>
                    </div>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleDemoLogin}
                  className="w-full max-w-[320px] py-2.5 px-4 bg-primary-light hover:bg-indigo-100 text-primary-dark border border-indigo-200 rounded-btn text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <span>⚡ Continue as Demo User</span>
                </button>
              </>
            )}
          </div>

          {/* Footer */}
          <p className="text-xs text-text-muted text-center mt-8">
            Sign in with Google or use the Demo account to explore all features.
            <br />
            No personal data is collected.
          </p>
        </div>

        {/* Below-card note */}
        <p className="text-xs text-text-muted text-center mt-6">
          Emails are sent through Ethereal SMTP for demonstration purposes.
        </p>
      </div>
    </div>
  );
}
