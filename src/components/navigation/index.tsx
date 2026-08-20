/**
 * Navigation Components
 *
 * Top application bar and bottom navigation bar for NotiCatch.
 * Styled in Anthropic Claude warm editorial aesthetic.
 */

import React from 'react';
import { MessageCircle, Trash2, Settings, ShieldCheck } from 'lucide-react';
import type { NavTab } from '@/types';

/* =============================================================
   Top App Bar
   ============================================================= */

interface TopAppBarProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly leading?: React.ReactNode;
  readonly trailing?: React.ReactNode;
}

export function TopAppBar({ title, subtitle, leading, trailing }: TopAppBarProps) {
  return (
    <header className="top-bar pt-safe">
      <div className="flex items-center gap-3 px-4 h-14">
        {leading && (
          <div className="flex-shrink-0">
            {leading}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-base font-bold text-content-primary truncate leading-tight tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-2xs text-content-muted truncate leading-tight mt-0.5 font-medium">
              {subtitle}
            </p>
          )}
        </div>
        {trailing && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {trailing}
          </div>
        )}
      </div>
    </header>
  );
}

/* =============================================================
   App Brand Header (Landing / Auth screens)
   ============================================================= */

export function AppBrand({ className = '', subtitle, size = 'md' }: { readonly className?: string; readonly subtitle?: string; readonly size?: string }) {
  return (
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-accent-muted flex items-center justify-center text-accent shadow-warm-sm">
          <ShieldCheck className="w-5 h-5" strokeWidth={2.2} />
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`font-serif font-bold text-content-primary tracking-tight ${size === 'lg' ? 'text-2xl' : 'text-xl'}`}>
            NotiCatch
          </span>
          <span className="text-2xs font-semibold text-accent bg-accent-muted px-2 py-0.5 rounded-full border border-accent/20">
            Vault
          </span>
        </div>
      </div>
      {subtitle && <p className="text-xs text-content-muted font-medium">{subtitle}</p>}
    </div>
  );
}

/* =============================================================
   Bottom Navigation Bar
   ============================================================= */

interface BottomNavbarProps {
  readonly activeTab:        NavTab;
  readonly onTabChange:      (tab: NavTab) => void;
  readonly deletedBadgeCount?: number;
}

const navItems: Array<{ tab: NavTab; label: string; icon: React.ReactNode; id: string }> = [
  {
    tab:   'chats',
    label: 'Chats',
    id:    'nav-tab-chats',
    icon:  <MessageCircle strokeWidth={2} />,
  },
  {
    tab:   'deleted',
    label: 'Deleted',
    id:    'nav-tab-deleted',
    icon:  <Trash2 strokeWidth={2} />,
  },
  {
    tab:   'settings',
    label: 'Settings',
    id:    'nav-tab-settings',
    icon:  <Settings strokeWidth={2} />,
  },
];

export function BottomNavbar({ activeTab, onTabChange, deletedBadgeCount = 0 }: BottomNavbarProps) {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      <div className="flex items-center max-w-lg mx-auto">
        {navItems.map(item => {
          const isActive = activeTab === item.tab;
          return (
            <button
              key={item.tab}
              id={item.id}
              type="button"
              onClick={() => onTabChange(item.tab)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center justify-center gap-1 h-15 transition-all duration-180 relative ${
                isActive
                  ? 'text-accent font-semibold'
                  : 'text-content-muted hover:text-content-secondary'
              }`}
            >
              {isActive && (
                <span
                  className="absolute top-0 w-8 h-0.5 bg-accent rounded-full"
                  style={{ marginTop: '-1px' }}
                />
              )}
              <div className="relative w-5 h-5 transition-transform duration-180">
                <div className={`${isActive ? 'scale-110 text-accent' : ''} transition-transform duration-180`}>
                  {item.icon}
                </div>
                {item.tab === 'deleted' && deletedBadgeCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-accent text-white text-[0.5rem] font-bold flex items-center justify-center shadow-xs"
                    aria-label={`${deletedBadgeCount} unread deleted messages`}
                  >
                    {deletedBadgeCount > 9 ? '9+' : deletedBadgeCount}
                  </span>
                )}
              </div>
              <span className={`text-2xs transition-all duration-180 ${
                isActive ? 'opacity-100 font-bold text-accent' : 'opacity-80 font-medium'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* =============================================================
   Icon Button
   ============================================================= */

interface IconButtonProps {
  readonly icon: React.ReactNode;
  readonly onClick?: () => void;
  readonly label: string;
  readonly id: string;
  readonly variant?: 'ghost' | 'filled';
}

export function IconButton({ icon, onClick, label, id, variant = 'ghost' }: IconButtonProps) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`w-9 h-9 rounded-xl flex items-center justify-center
        transition-all duration-180 active:scale-92 ${
          variant === 'filled'
            ? 'bg-surface-850 border border-surface-700 text-content-primary hover:bg-surface-700'
            : 'text-content-secondary hover:text-content-primary hover:bg-surface-850'
        }`}
    >
      {icon}
    </button>
  );
}
