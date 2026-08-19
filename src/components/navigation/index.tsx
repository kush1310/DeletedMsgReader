/**
 * Navigation Components
 *
 * Top application bar and bottom navigation bar for the NotiCatch app.
 * All interactive navigation elements use unique IDs for testing and accessibility.
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

/**
 * TopAppBar
 *
 * Fixed top navigation bar with a title, optional subtitle,
 * leading slot (back button / avatar), and trailing slot (action icons).
 * Styled with light frosted surface over scroll content.
 *
 * @param  title     - Primary page title text.
 * @param  subtitle  - Optional secondary descriptor below the title.
 * @param  leading   - Optional leading element (icon button or avatar).
 * @param  trailing  - Optional trailing element (action button or icon).
 */
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
          <h1 className="text-base font-bold text-content-primary truncate leading-tight tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-content-muted truncate leading-tight mt-0.5 font-medium">
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

/**
 * AppBrand
 *
 * Displays the NotiCatch application name as plain styled text with
 * a security badge icon and a muted version chip.
 * Plain text only — no abbreviation icons beside the name.
 */
export function AppBrand({ className = '' }: { readonly className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-8 h-8 rounded-xl bg-accent-muted flex items-center justify-center">
        <ShieldCheck className="w-5 h-5 text-accent" strokeWidth={2.2} />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-bold text-content-primary tracking-tight">NotiCatch</span>
        <span className="text-2xs font-bold text-content-muted bg-surface-800 border border-surface-700 px-1.5 py-0.5 rounded-full">v1.0</span>
      </div>
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

/**
 * BottomNavbar
 *
 * Fixed bottom navigation bar with three primary tabs:
 *   - Chats: Conversation list view
 *   - Deleted: Filtered deleted-messages view with amber badge count
 *   - Settings: Security and configuration controls
 *
 * @param  {NavTab}   activeTab         - Currently active route tab.
 * @param  {Function} onTabChange       - Tab switch callback.
 * @param  {number}   deletedBadgeCount - Unread deleted message count for the Deleted tab badge.
 */
export function BottomNavbar({ activeTab, onTabChange, deletedBadgeCount = 0 }: BottomNavbarProps) {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      <div className="flex items-center">
        {navItems.map(item => {
          const isActive = activeTab === item.tab;
          return (
            <button
              key={item.tab}
              id={item.id}
              type="button"
              onClick={() => onTabChange(item.tab)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center justify-center gap-1 h-16 transition-all duration-200 relative ${
                isActive
                  ? 'text-accent font-semibold'
                  : 'text-content-muted hover:text-content-secondary'
              }`}
            >
              {isActive && (
                <span
                  className="absolute top-0 w-10 h-0.5 bg-accent rounded-full"
                  style={{ marginTop: '-1px' }}
                />
              )}
              <div className="relative w-5 h-5 transition-transform duration-200">
                <div className={`${isActive ? 'scale-110' : ''} transition-transform duration-200`}>
                  {item.icon}
                </div>
                {item.tab === 'deleted' && deletedBadgeCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-amber-500 text-white text-[0.5rem] font-extrabold flex items-center justify-center shadow-xs"
                    aria-label={`${deletedBadgeCount} unread deleted messages`}
                  >
                    {deletedBadgeCount > 9 ? '9+' : deletedBadgeCount}
                  </span>
                )}
              </div>
              <span className={`text-2xs transition-all duration-200 ${
                isActive ? 'opacity-100 font-bold' : 'opacity-80 font-medium'
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

/**
 * IconButton
 *
 * Circular tappable icon button for use in app bars and toolbars.
 * Always requires an accessible aria-label.
 */
export function IconButton({ icon, onClick, label, id, variant = 'ghost' }: IconButtonProps) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`w-9 h-9 rounded-xl flex items-center justify-center
        transition-all duration-200 ease-spring active:scale-90 ${
          variant === 'filled'
            ? 'bg-surface-700 border border-surface-600 text-content-primary hover:bg-surface-600'
            : 'text-content-secondary hover:text-content-primary hover:bg-surface-700'
        }`}
    >
      {icon}
    </button>
  );
}
