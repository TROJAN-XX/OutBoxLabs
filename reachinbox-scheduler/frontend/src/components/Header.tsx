import React from 'react';
import { LogOut, Mail } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Avatar } from './Avatar';

export function Header() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="bg-white border-b border-border sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-primary rounded-lg">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-text-primary">
              ReachInbox
            </span>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium text-text-primary leading-tight">
                {user.name}
              </span>
              <span className="text-xs text-text-secondary leading-tight">
                {user.email}
              </span>
            </div>
            <Avatar src={user.avatarUrl} name={user.name} size="md" />
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-error rounded-btn hover:bg-error-light transition-colors focus-ring"
              aria-label="Log out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
