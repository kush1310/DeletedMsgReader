/**
 * Navigation Components — NotiCatch Material 3 Navigation System
 *
 * TopAppBar     — Fixed top bar with scroll-elevation, safe-area padding,
 *                 semantic token surface, optional back-navigation.
 *
 * AppBrand      — Application brand text block. Renders "NotiCatch" as plain
 *                 styled text only — no abbreviation icon beside the name per
 *                 NotiCatch brand guidelines.
 *
 * BottomNavbar  — Material 3 tonal navigation bar. Light neutral surface on
 *                 light theme, dark lifted surface on dark theme. Primary-
 *                 container tonal indicator pill behind the active tab.
 *                 Smooth spring selection animation. 56dp per tab.
 *
 * IconButton    — 48dp touch target ghost or filled icon button.
 *                 Haptic tap on every press.
 */

import React, { useCallback } from 'react';
import { MessageCircle, ShieldAlert, Settings } from 'lucide-react';
import type { NavTab } from '@/types';
import { HapticService } from '@/services/HapticService';

/* =============================================================================
   Top App Bar
   ============================================================================= */

interface TopAppBarProps {
  readonly title:       string;
  readonly subtitle?:   string;
  readonly leading?:    React.ReactNode;
  readonly trailing?:   React.ReactNode;
  readonly onBack?:     () => void;
  readonly dark?:       boolean;
  readonly scrolled?:   boolean;
}

/**
 * TopAppBar
 *
 * Fixed header bar used on all primary and secondary pages. Follows Material 3
 * top app bar specification: surface color, 56dp height, safe-area aware,
 * optional back-navigation, trailing icon slot, subtitle slot.
 *
 * Scrolled state: adds elevation shadow and removes visible border for a
 * smooth scrolled-content visual separation cue (MD3 scroll behavior).
 *
 * @param title     - Page title displayed in the heading element.
 * @param subtitle  - Optional secondary line below the title.
 * @param leading   - Leading slot — back button, shield icon, etc.
 * @param trailing  - Trailing slot — icon action buttons.
 * @param onBack    - If provided, the back button is shown in the leading slot.
 * @param dark      - Reserved — dark mode is now controlled by html.dark class.
 * @param scrolled  - If true applies MD3 scroll elevation behavior.
 */
export function TopAppBar({ title, subtitle, leading, trailing, scrolled = false }: TopAppBarProps) {
  return (
    <header
      className={`top-bar pt-safe transition-shadow duration-220 ${scrolled ? 'top-bar-scrolled' : ''}`}
      aria-label={title}
    >
      <div className="flex items-center gap-2 px-3 h-14">
        {leading && (
          <div className="flex-shrink-0">
            {leading}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-on-surface truncate leading-tight tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-2xs text-on-surface-variant truncate leading-tight mt-px font-medium">
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

/* =============================================================================
   App Brand Header (Login / Onboarding screens only)
   ============================================================================= */

interface AppBrandProps {
  readonly className?: string;
  readonly subtitle?:  string;
  readonly size?:      'md' | 'lg';
}

/**
 * AppBrand
 *
 * NotiCatch application brand block for authentication and onboarding screens.
 * Renders the application name as styled text with a version pill.
 *
 * Per brand guidelines: NO abbreviation/initials icon placed beside the app name.
 * The brand mark is text-only. A separate icon (ShieldCheck) may be placed
 * independently in the leading slot of the TopAppBar where contextually needed.
 *
 * @param className - Additional layout classes.
 * @param subtitle  - Optional tagline below the application name.
 * @param size      - 'md' for compact placement, 'lg' for auth hero.
 */
export function AppBrand({ className = '', subtitle, size = 'md' }: AppBrandProps) {
  return (
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      <div className="flex items-center gap-2">
        <span
          className={`font-extrabold text-on-surface tracking-tight ${size === 'lg' ? 'text-2xl' : 'text-xl'}`}
          style={{ letterSpacing: '-0.02em' }}
        >
          NotiCatch
        </span>
        <span
          className="text-2xs font-bold px-2 py-0.5 rounded-full"
          style={{
            background: 'var(--md-sys-color-primary-container)',
            color: 'var(--md-sys-color-on-primary-container)',
            border: '1px solid var(--md-sys-color-outline-variant)',
          }}
        >
          v2.0.1
        </span>
      </div>
      {subtitle && (
        <p className="text-xs text-on-surface-variant font-medium">{subtitle}</p>
      )}
    </div>
  );
}

/* =============================================================================
   Bottom Navigation Bar — Material 3 Tonal Navigation Bar
   ============================================================================= */

interface BottomNavbarProps {
  readonly activeTab:          NavTab;
  readonly onTabChange:        (tab: NavTab) => void;
  readonly deletedBadgeCount?: number;
}

interface NavItem {
  readonly tab:   NavTab;
  readonly label: string;
  readonly icon:  React.ReactNode;
  readonly id:    string;
}

const NAV_ITEMS: NavItem[] = [
  {
    tab:   'chats',
    label: 'Chats',
    id:    'nav-tab-chats',
    icon:  <MessageCircle strokeWidth={2} className="w-[22px] h-[22px]" />,
  },
  {
    tab:   'deleted',
    label: 'Deleted',
    id:    'nav-tab-deleted',
    icon:  <ShieldAlert strokeWidth={2} className="w-[22px] h-[22px]" />,
  },
  {
    tab:   'settings',
    label: 'Settings',
    id:    'nav-tab-settings',
    icon:  <Settings strokeWidth={2} className="w-[22px] h-[22px]" />,
  },
];

/**
 * BottomNavbar
 *
 * Material 3 Navigation Bar — the sole primary navigation mechanism for NotiCatch.
 * Three fixed destinations: Chats, Deleted Vault, Settings.
 *
 * Light theme: surface-container-low (near-white) with primary-container tonal
 * indicator behind active tab icon + label.
 * Dark theme: surface-container-low (dark lifted) with dark primary-container.
 *
 * The dark glassmorphism pill from v1.6.2 is replaced. This bar is always
 * anchored flush to the bottom of the screen with safe-area inset padding.
 *
 * Haptic feedback: navigate() fires on every tab press.
 *
 * @param activeTab          - Currently selected tab key.
 * @param onTabChange        - Callback when the user taps a tab.
 * @param deletedBadgeCount  - Optional unread count badge on the Deleted tab.
 */
export function BottomNavbar({ activeTab, onTabChange, deletedBadgeCount = 0 }: BottomNavbarProps) {
  const handleTabPress = useCallback((tab: NavTab) => {
    HapticService.navigate();
    onTabChange(tab);
  }, [onTabChange]);

  return (
    <nav
      className="bottom-nav"
      aria-label="Primary navigation"
    >
      <div className="flex items-stretch">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.tab;
          return (
            <button
              key={item.tab}
              id={item.id}
              type="button"
              onClick={() => handleTabPress(item.tab)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              className="nav-tab touch-manipulation"
              style={{ transition: 'color 200ms var(--md-motion-easing-standard)' }}
            >
              {/* Tonal indicator pill behind active icon + label */}
              <div
                className="nav-tab-indicator"
                aria-hidden="true"
              />

              {/* Icon layer */}
              <div className="relative flex items-center justify-center z-10">
                <div
                  className="transition-all duration-200"
                  style={{
                    transform: isActive ? 'scale(1.05)' : 'scale(1)',
                    color: isActive
                      ? 'var(--md-sys-color-on-primary-container)'
                      : 'var(--md-sys-color-on-surface-variant)',
                    transition: 'transform 220ms var(--md-motion-easing-spring), color 200ms var(--md-motion-easing-standard)',
                  }}
                >
                  {item.icon}
                </div>

                {/* Deleted badge count */}
                {item.tab === 'deleted' && deletedBadgeCount > 0 && (
                  <span
                    className="badge-unread absolute -top-2 -right-2.5 text-[0.5rem]"
                    aria-label={`${deletedBadgeCount} recovered deleted messages`}
                    style={{ minWidth: '1.125rem', height: '1.125rem', padding: '0 4px' }}
                  >
                    {deletedBadgeCount > 9 ? '9+' : deletedBadgeCount}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className="text-2xs leading-none z-10 transition-all duration-200"
                style={{
                  fontWeight: isActive ? 700 : 500,
                  color: isActive
                    ? 'var(--md-sys-color-on-primary-container)'
                    : 'var(--md-sys-color-on-surface-variant)',
                  transition: 'font-weight 200ms var(--md-motion-easing-standard), color 200ms var(--md-motion-easing-standard)',
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

/* =============================================================================
   Icon Button — 48dp accessible touch target
   ============================================================================= */

interface IconButtonProps {
  readonly icon:     React.ReactNode;
  readonly onClick?: () => void | Promise<void>;
  readonly label:    string;
  readonly id:       string;
  readonly variant?: 'ghost' | 'tonal' | 'filled';
  readonly active?:  boolean;
  readonly disabled?: boolean;
}

/**
 * IconButton
 *
 * Accessible 48dp touch target icon button. Used in TopAppBar trailing/leading
 * slots and throughout the application for secondary actions.
 *
 * Variants:
 *   ghost  — transparent background, on-surface-variant icon, hover tonal surface.
 *   tonal  — surface-container filled with on-surface-variant icon.
 *   filled — primary filled with on-primary icon (for primary FAB-style contexts).
 *
 * Haptic: fires HapticService.tap() on every press.
 *
 * @param icon     - Lucide React icon element.
 * @param onClick  - Press handler.
 * @param label    - Accessibility aria-label string.
 * @param id       - Unique element ID for automated testing.
 * @param variant  - 'ghost' (default), 'tonal', 'filled'.
 * @param active   - If true applies active/selected styling.
 * @param disabled - If true disables the button.
 */
export function IconButton({ icon, onClick, label, id, variant = 'ghost', active = false, disabled = false }: IconButtonProps) {
  const handlePress = useCallback(() => {
    if (disabled) return;
    HapticService.tap();
    onClick?.();
  }, [onClick, disabled]);

  const baseClass = 'w-12 h-12 min-h-[48px] min-w-[48px] rounded-xl flex items-center justify-center transition-all duration-180 touch-manipulation no-select';

  const variantStyle: React.CSSProperties = variant === 'filled'
    ? {
        backgroundColor: 'var(--md-sys-color-primary)',
        color: 'var(--md-sys-color-on-primary)',
      }
    : variant === 'tonal'
    ? {
        backgroundColor: active
          ? 'var(--md-sys-color-primary-container)'
          : 'var(--md-sys-color-surface-container)',
        color: active
          ? 'var(--md-sys-color-on-primary-container)'
          : 'var(--md-sys-color-on-surface-variant)',
        border: '1px solid var(--md-sys-color-outline-variant)',
      }
    : {
        backgroundColor: active
          ? 'var(--md-sys-color-primary-container)'
          : 'transparent',
        color: active
          ? 'var(--md-sys-color-on-primary-container)'
          : 'var(--md-sys-color-on-surface-variant)',
      };

  return (
    <button
      id={id}
      type="button"
      onClick={handlePress}
      aria-label={label}
      disabled={disabled}
      className={`${baseClass} ${disabled ? 'opacity-40 cursor-not-allowed' : 'active:scale-90'}`}
      style={variantStyle}
    >
      {icon}
    </button>
  );
}
