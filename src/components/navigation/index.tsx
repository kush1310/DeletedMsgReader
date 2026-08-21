/**
 * Navigation Components
 *
 * TopAppBar and BottomNavbar for NotiCatch.
 *
 * Visual system: Signal Android — pure white top bar, white bottom nav,
 * Signal Blue (#2C6BED) active tab indicator with pill background,
 * clean Plus Jakarta Sans typography throughout.
 *
 * Architecture: Single bottom navigation bar is the ONLY primary navigation
 * mechanism. No hamburger button. No sidebar drawer.
 */

import React from 'react';
import { MessageCircle, ShieldAlert, Settings, ShieldCheck } from 'lucide-react';
import type { NavTab } from '@/types';

/* =============================================================
   Top App Bar — Signal White Style
   ============================================================= */

interface TopAppBarProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly leading?: React.ReactNode;
  readonly trailing?: React.ReactNode;
  readonly dark?: boolean;
}

/**
 * TopAppBar
 *
 * Fixed header bar used on all primary pages. Follows Signal Android's clean
 * white top bar pattern: app icon or back button on the leading edge, page
 * title in the center-left, and icon actions on the trailing edge.
 *
 * @param title     - Page or conversation title displayed prominently.
 * @param subtitle  - Optional secondary label (sync time, member count, etc.).
 * @param leading   - Leading slot — back button or app shield icon.
 * @param trailing  - Trailing slot — icon action buttons.
 * @param dark      - If true renders the dark variant for chat detail screens.
 */
export function TopAppBar({ title, subtitle, leading, trailing, dark = false }: TopAppBarProps) {
  const barClass = dark ? 'top-bar-dark' : 'top-bar';
  const titleColor = dark ? 'text-white' : 'text-[#111827]';
  const subtitleColor = dark ? 'text-[#9CA3AF]' : 'text-[#9CA3AF]';

  return (
    <header className={`${barClass} pt-safe`}>
      <div className="flex items-center gap-2 px-3 h-14">
        {leading && (
          <div className="flex-shrink-0">
            {leading}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className={`text-base font-bold ${titleColor} truncate leading-tight tracking-tight`}>
            {title}
          </h1>
          {subtitle && (
            <p className={`text-2xs ${subtitleColor} truncate leading-tight mt-0.5 font-medium`}>
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
 * NotiCatch brand block displayed on the Login, Landing, and Setup screens.
 * Shows the shield icon alongside "NotiCatch" and the version pill.
 *
 * @param className - Additional layout classes for positioning.
 * @param subtitle  - Optional tagline below the app name.
 * @param size      - 'md' (default) or 'lg' for bigger auth screens.
 */
export function AppBrand({ className = '', subtitle, size = 'md' }: { readonly className?: string; readonly subtitle?: string; readonly size?: string }) {
  return (
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[#2C6BED]" style={{ background: '#EEF2FF' }}>
          <ShieldCheck className="w-5 h-5" strokeWidth={2.2} />
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`font-bold text-[#111827] tracking-tight ${size === 'lg' ? 'text-2xl' : 'text-xl'}`}>
            NotiCatch
          </span>
          <span className="text-2xs font-semibold text-[#2C6BED] px-2 py-0.5 rounded-full border border-[#DBEAFE]" style={{ background: '#EEF2FF' }}>
            v1.6.3
          </span>
        </div>
      </div>
      {subtitle && <p className="text-xs text-[#9CA3AF] font-medium">{subtitle}</p>}
    </div>
  );
}

/* =============================================================
   Bottom Navigation Bar — Signal 3-Tab Style
   ============================================================= */

interface BottomNavbarProps {
  readonly activeTab:          NavTab;
  readonly onTabChange:        (tab: NavTab) => void;
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
    icon:  <ShieldAlert strokeWidth={2} />,
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
 * The SOLE primary navigation for NotiCatch. Three destinations:
 * Chats, Deleted Vault, and Settings.
 *
 * Visual pattern (from reference images):
 * - Outer container: dark pill/capsule with glassmorphism blur — deep navy
 *   background (#0D0D1A) with a subtle translucent border. Floats above content.
 * - Active tab: lighter frosted pill highlight behind icon + label with white
 *   icon and bold white label text. Scale-up animation on tap.
 * - Inactive tabs: muted grey icon + label, subtle hover lightening.
 * - Badge: Signal-blue count dot on the Deleted tab.
 *
 * @param activeTab          - Currently selected tab key.
 * @param onTabChange        - Callback when the user taps a tab.
 * @param deletedBadgeCount  - Optional unread count badge on the Deleted tab.
 */
export function BottomNavbar({ activeTab, onTabChange, deletedBadgeCount = 0 }: BottomNavbarProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex justify-center pb-safe pt-1.5 px-4"
      style={{ background: 'transparent' }}
      aria-label="Primary navigation"
    >
      {/* Dark glassmorphism pill container */}
      <div
        className="flex items-center w-full max-w-sm rounded-full px-2 py-2"
        style={{
          background: 'rgba(13, 13, 26, 0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.10)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.40), 0 2px 8px rgba(0, 0, 0, 0.30)',
        }}
      >
        {navItems.map(item => {
          const isActive = activeTab === item.tab;
          return (
            <button
              key={item.tab}
              id={item.id}
              type="button"
              onClick={() => onTabChange(item.tab)}
              aria-current={isActive ? 'page' : undefined}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-full transition-all duration-200 relative"
              style={{
                /* Active tab: frosted lighter pill highlight */
                background: isActive
                  ? 'rgba(44, 107, 237, 0.22)'
                  : 'transparent',
              }}
            >
              {/* Icon with scale animation */}
              <div className="relative flex items-center justify-center">
                <div
                  className={`w-5 h-5 transition-all duration-200 ${isActive ? 'scale-110' : 'scale-100'}`}
                  style={{ color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.45)' }}
                >
                  {item.icon}
                </div>
                {/* Badge dot on Deleted tab */}
                {item.tab === 'deleted' && deletedBadgeCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full text-white text-[0.5rem] font-bold flex items-center justify-center"
                    style={{ background: '#2C6BED' }}
                    aria-label={`${deletedBadgeCount} recovered deleted messages`}
                  >
                    {deletedBadgeCount > 9 ? '9+' : deletedBadgeCount}
                  </span>
                )}
              </div>
              {/* Label */}
              <span
                className="text-[0.6rem] leading-none transition-all duration-200"
                style={{
                  color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.45)',
                  fontWeight: isActive ? 700 : 500,
                }}
              >
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
   Icon Button — Signal ghost-style touch target
   ============================================================= */

interface IconButtonProps {
  readonly icon: React.ReactNode;
  readonly onClick?: () => void;
  readonly label: string;
  readonly id: string;
  readonly variant?: 'ghost' | 'filled';
  readonly dark?: boolean;
}

/**
 * IconButton
 *
 * 44px touch target icon button for use in TopAppBar trailing and leading slots.
 * Ghost variant: transparent background with subtle hover highlight.
 * Filled variant: light grey filled pill for secondary actions.
 *
 * @param icon    - Lucide React icon element.
 * @param onClick - Press handler.
 * @param label   - Accessibility aria-label string.
 * @param id      - Unique element ID for testing.
 * @param variant - 'ghost' (default) or 'filled'.
 * @param dark    - If true renders white icon for dark backgrounds.
 */
export function IconButton({ icon, onClick, label, id, variant = 'ghost', dark = false }: IconButtonProps) {
  const colorClass = dark
    ? 'text-white hover:bg-white/10'
    : variant === 'filled'
      ? 'bg-[#F2F2F7] border border-[#E5E7EB] text-[#111827] hover:bg-[#E9ECEF]'
      : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#F2F2F7]';

  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center
        transition-all duration-180 active:scale-95 ${colorClass}`}
    >
      {icon}
    </button>
  );
}
