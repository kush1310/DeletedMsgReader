/**
 * Common UI Component Library — NotiCatch Material 3 Expressive Component System
 *
 * All components are semantic-token-based, fully dark/light theme aware,
 * and include Motion animations, haptic hooks, and 48dp touch targets.
 *
 * Exported:
 *   LoadingSpinner, Skeleton
 *   DeletedBadge, RecoveredBadge
 *   SearchInput
 *   Avatar
 *   SectionDivider
 *   EmptyState
 *   SettingsRow
 *   Toast, ToastContainer
 *   ToggleSwitch
 *   FloatingPill
 *   ThreeSecurityCanvas, ConfirmationModal, LegalDocumentModal
 *   ColorModeModal, FontStyleModal
 */

import React, { useRef, useCallback, useEffect } from 'react';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  X,
  Search,
  ChevronRight,
  Shield,
  Users,
} from 'lucide-react';
import type { ToastMessage, ToastSeverity } from '@/types';
import { HapticService } from '@/services/HapticService';
export { ThreeSecurityCanvas } from './ThreeSecurityCanvas';
export { ConfirmationModal } from './ConfirmationModal';
export { LegalDocumentModal } from './LegalDocumentModal';
export { ColorModeModal, type ColorMode } from './ColorModeModal';
export { FontStyleModal, type FontStyle } from './FontStyleModal';

/* =============================================================================
   Ripple Utility — programmatic ripple on pointer events
   ============================================================================= */

/**
 * addRipple
 *
 * Appends a Material Design ripple wave element to the target container
 * at the pointer event coordinates. Self-removes after animation completes.
 *
 * @param event     - The React pointer event that triggered the ripple.
 * @param container - The DOM element acting as the ripple container. Must have
 *                    position:relative and overflow:hidden.
 */
export function addRipple(event: React.MouseEvent | React.TouchEvent, container: HTMLElement | null): void {
  if (!container) return;

  const rect = container.getBoundingClientRect();
  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

  const rippleX = clientX - rect.left;
  const rippleY = clientY - rect.top;
  const size    = Math.max(rect.width, rect.height) * 2;

  const wave = document.createElement('span');
  wave.className = 'ripple-wave';
  wave.style.width  = `${size}px`;
  wave.style.height = `${size}px`;
  wave.style.left   = `${rippleX - size / 2}px`;
  wave.style.top    = `${rippleY - size / 2}px`;

  container.appendChild(wave);
  wave.addEventListener('animationend', () => wave.remove(), { once: true });
}

/* =============================================================================
   Loading Spinner
   ============================================================================= */

interface LoadingSpinnerProps {
  readonly size?:      'sm' | 'md' | 'lg';
  readonly className?: string;
}

/**
 * LoadingSpinner
 *
 * Animated circular loader using primary token color.
 *
 * @param size      - 'sm' (16px), 'md' (24px), 'lg' (32px).
 * @param className - Additional Tailwind classes.
 */
export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeMap = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <Loader2
      className={`animate-spin ${sizeMap[size]} ${className}`}
      style={{ color: 'var(--md-sys-color-primary)' }}
      aria-label="Loading"
    />
  );
}

/* =============================================================================
   Skeleton Loader
   ============================================================================= */

interface SkeletonProps {
  readonly className?: string;
}

/**
 * Skeleton
 *
 * Shimmer placeholder for content loading states.
 * Uses surface-container tokens so it works in both light and dark themes.
 *
 * @param className - Shape and size classes (e.g., "h-4 w-32 rounded-full").
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/**
 * ConversationSkeleton
 *
 * Material 3 Expressive skeleton rows mimicking the 72dp conversation list items.
 */
export function ConversationSkeleton({ count = 6 }: { readonly count?: number }) {
  return (
    <div className="divide-y" style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 flex items-center gap-3 animate-pulse">
          <div className="w-12 h-12 rounded-full skeleton flex-shrink-0" />
          <div className="flex-1 space-y-2.5 min-w-0">
            <div className="flex items-center justify-between">
              <div className="h-4 w-32 rounded-full skeleton" />
              <div className="h-3 w-12 rounded-full skeleton" />
            </div>
            <div className="h-3.5 w-48 rounded-full skeleton" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * MessageTimelineSkeleton
 *
 * Material 3 Expressive message bubble skeleton placeholders for chat timeline loading.
 */
export function MessageTimelineSkeleton({ count = 6 }: { readonly count?: number }) {
  return (
    <div className="p-4 space-y-4">
      {Array.from({ length: count }).map((_, i) => {
        const isAlternate = i % 3 === 2;
        return (
          <div
            key={i}
            className={`flex flex-col gap-1.5 animate-pulse max-w-[80%] ${
              isAlternate ? 'ml-auto items-end' : 'items-start'
            }`}
          >
            <div
              className="p-3.5 rounded-2xl skeleton"
              style={{
                width: `${140 + (i % 3) * 60}px`,
                height: `${46 + (i % 2) * 20}px`,
                borderRadius: '16px',
              }}
            />
            <div className="h-2.5 w-14 rounded-full skeleton opacity-50" />
          </div>
        );
      })}
    </div>
  );
}

/* =============================================================================
   Badges
   ============================================================================= */

interface DeletedBadgeProps {
  readonly compact?: boolean;
}

/**
 * DeletedBadge
 *
 * Amber pill badge indicating deleted message recovery. Uses tertiary-container
 * semantic tokens so it correctly inverts in dark theme.
 *
 * @param compact - If true shows only the warning icon (no text label).
 */
function DeletedBadgeInternal({ compact = false }: DeletedBadgeProps) {
  return (
    <span className="badge-deleted">
      <AlertTriangle className="w-3 h-3" aria-hidden="true" style={{ color: 'var(--md-color-deleted-icon)' }} strokeWidth={2.2} />
      {!compact && 'Deleted'}
    </span>
  );
}

export const DeletedBadge = React.memo(DeletedBadgeInternal);

function RecoveredBadgeInternal() {
  return (
    <span className="badge-recovered">
      <Shield className="w-3 h-3" aria-hidden="true" style={{ color: 'var(--md-color-protected-icon)' }} strokeWidth={2.2} />
      Recovered
    </span>
  );
}

export const RecoveredBadge = React.memo(RecoveredBadgeInternal);

/* =============================================================================
   Search Input
   ============================================================================= */

interface SearchInputProps {
  readonly value:          string;
  readonly onChange:       (value: string) => void;
  readonly placeholder?:  string;
  readonly id:             string;
  readonly matchCount?:    number;
  readonly algorithmLabel?: string;
  readonly autoFocus?:     boolean;
}

/**
 * SearchInput
 *
 * Animated search bar with leading search icon, clear button, and optional
 * match count indicator. Uses full-pill radius with surface-container fill.
 *
 * @param value         - Controlled search query string.
 * @param onChange      - Callback with the new query value.
 * @param placeholder   - Placeholder text.
 * @param id            - Unique element ID.
 * @param matchCount    - Optional number of matches to display.
 * @param autoFocus     - If true, auto-focuses the input on mount.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  id,
  matchCount,
  autoFocus = false,
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  return (
    <div className="relative flex flex-col gap-1.5 animate-slide-down">
      <div className="relative">
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          strokeWidth={2}
          style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
        />
        <input
          ref={inputRef}
          id={id}
          type="search"
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={placeholder}
          className="search-bar pr-10"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          style={{ paddingLeft: '2.75rem' }}
        />
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => {
              HapticService.tap();
              onChange('');
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors"
            style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2.2} />
          </button>
        )}
      </div>

      {value.length > 0 && matchCount !== undefined && (
        <div
          className="flex items-center justify-end px-1 text-2xs animate-fade-in font-medium"
          style={{ color: 'var(--md-sys-color-on-surface-muted)' }}
        >
          {matchCount} match{matchCount !== 1 ? 'es' : ''} found
        </div>
      )}
    </div>
  );
}

/* =============================================================================
   Avatar — Material 3 Circular Contact Avatar
   ============================================================================= */

interface AvatarProps {
  readonly name:               string;
  readonly size?:              'xs' | 'sm' | 'md' | 'lg';
  readonly isGroup?:           boolean;
  readonly hasRecentDeletion?: boolean;
  readonly colorIndex?:        number;
}

/* Tonal avatar palette — 8 distinct hue/tone pairs that work in both themes */
const AVATAR_TONES: Array<{ bg: string; text: string }> = [
  { bg: 'var(--md-sys-color-primary-container)',          text: 'var(--md-sys-color-on-primary-container)' },
  { bg: 'var(--md-sys-color-tertiary-container)',         text: 'var(--md-sys-color-on-tertiary-container)' },
  { bg: 'var(--md-sys-color-success-container)',          text: 'var(--md-sys-color-on-success-container)' },
  { bg: 'var(--md-sys-color-error-container)',            text: 'var(--md-sys-color-on-error-container)' },
  { bg: 'var(--md-sys-color-surface-container-highest)',  text: 'var(--md-sys-color-on-surface)' },
  { bg: 'var(--md-sys-color-information-container)',      text: 'var(--md-sys-color-on-information-container)' },
  { bg: 'var(--md-sys-color-secondary-container)',        text: 'var(--md-sys-color-on-secondary-container)' },
  { bg: 'var(--md-sys-color-warning-container)',          text: 'var(--md-sys-color-on-warning-container)' },
];

/**
 * Avatar
 *
 * Circular contact or group avatar displaying initials derived from the name.
 * Colors cycle through 8 tonal pairs from the MD3 palette, keyed by name's
 * first character code for consistency across app launches.
 *
 * Groups show a Users icon instead of initials.
 *
 * @param name               - Contact or group display name.
 * @param size               - 'xs' 28px, 'sm' 36px, 'md' 44px, 'lg' 56px.
 * @param isGroup            - If true renders Users icon for group visual.
 * @param hasRecentDeletion  - If true adds an amber ring to signal recent activity.
 * @param colorIndex         - Override tone index. If omitted, derived from name.
 */
function AvatarInternal({ name, size = 'md', isGroup = false, hasRecentDeletion = false, colorIndex }: AvatarProps) {
  const sizeMap: Record<string, string> = {
    xs: 'w-7 h-7 text-2xs',
    sm: 'w-9 h-9 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-14 h-14 text-base',
  };

  const index   = colorIndex !== undefined ? colorIndex % AVATAR_TONES.length : (name.charCodeAt(0) || 0) % AVATAR_TONES.length;
  const tone    = AVATAR_TONES[index];
  const initials = name.trim().split(' ').slice(0, 2).map(word => word[0]).join('').toUpperCase();

  return (
    <div
      className={`${sizeMap[size]} rounded-full flex items-center justify-center font-bold flex-shrink-0 select-none relative`}
      style={{
        backgroundColor: tone.bg,
        color: tone.text,
        outline: hasRecentDeletion
          ? '2px solid var(--md-sys-color-tertiary)'
          : 'none',
        outlineOffset: '2px',
        transition: 'outline 220ms var(--md-motion-easing-standard)',
      }}
      role="img"
      aria-label={`Avatar for ${name}`}
    >
      {isGroup
        ? <Users className="w-[55%] h-[55%]" strokeWidth={2} aria-hidden="true" />
        : <span aria-hidden="true">{initials || '?'}</span>
      }
    </div>
  );
}

export const Avatar = React.memo(AvatarInternal);

/* =============================================================================
   Section Divider
   ============================================================================= */

interface SectionDividerProps {
  readonly label?: string;
}

/**
 * SectionDivider
 *
 * Horizontal rule with optional centered text label. Uses outline-variant token.
 *
 * @param label - Optional text to display in the center of the divider.
 */
export function SectionDivider({ label }: SectionDividerProps) {
  if (!label) {
    return (
      <hr
        className="my-3"
        style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}
      />
    );
  }
  return (
    <div className="flex items-center gap-3 my-4">
      <hr className="flex-1" style={{ borderColor: 'var(--md-sys-color-outline-variant)' }} />
      <span
        className="text-2xs font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full"
        style={{
          color: 'var(--md-sys-color-on-surface-variant)',
          background: 'var(--md-sys-color-surface-container)',
          border: '1px solid var(--md-sys-color-outline-variant)',
        }}
      >
        {label}
      </span>
      <hr className="flex-1" style={{ borderColor: 'var(--md-sys-color-outline-variant)' }} />
    </div>
  );
}

/* =============================================================================
   Empty State — Expressive Hero Treatment
   ============================================================================= */

interface EmptyStateProps {
  readonly icon:        React.ReactNode;
  readonly title:       string;
  readonly description: string;
  readonly action?:     React.ReactNode;
}

/**
 * EmptyState
 *
 * Expressive empty state with a large icon container, centered heading, and
 * description. Optional action slot for a primary CTA button.
 *
 * Icon container uses surface-container with tonal border and subtle shadow,
 * consistent across both light and dark themes via semantic tokens.
 *
 * @param icon        - React node (Lucide icon or custom SVG).
 * @param title       - Short, user-friendly heading.
 * @param description - Supporting explanation text.
 * @param action      - Optional CTA element (button).
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 px-8 py-16 text-center animate-fade-in">
      <div
        className="w-16 h-16 rounded-3xl flex items-center justify-center shadow-sm animate-scale-in"
        style={{
          background: 'var(--md-sys-color-surface-container)',
          border: '1px solid var(--md-sys-color-outline-variant)',
          color: 'var(--md-sys-color-primary)',
        }}
      >
        {icon}
      </div>
      <div className="space-y-2">
        <p
          className="font-bold text-base tracking-tight"
          style={{ color: 'var(--md-sys-color-on-surface)' }}
        >
          {title}
        </p>
        <p
          className="text-xs leading-relaxed max-w-[280px] font-medium"
          style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
        >
          {description}
        </p>
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/* =============================================================================
   Settings Row — Material 3 List Item
   ============================================================================= */

interface SettingsRowProps {
  readonly icon:         React.ReactNode;
  readonly label:        string;
  readonly description?: string;
  readonly value?:       string;
  readonly control?:     React.ReactNode;
  readonly onClick?:     () => void | Promise<void>;
  readonly id?:          string;
  readonly danger?:      boolean;
  readonly badge?:       string;
  readonly selected?:    boolean;
  readonly disabled?:    boolean;
}

/**
 * SettingsRow
 *
 * Material 3 list item for settings screens. Minimum 56dp touch target.
 * Supports value display, trailing control (toggle/badge), danger state,
 * selected state, and disabled state.
 *
 * Haptic: fires HapticService.selection() on press.
 *
 * @param icon        - 20px icon in a 40dp rounded container.
 * @param label       - Primary label text.
 * @param description - Optional secondary description line.
 * @param value       - Optional current value string shown before chevron.
 * @param control     - Optional trailing slot (ToggleSwitch, etc.).
 * @param onClick     - Press handler.
 * @param id          - Unique element ID.
 * @param danger      - If true renders destructive red styling.
 * @param badge       - Optional text badge on the right.
 * @param selected    - If true shows a checkmark or active state.
 * @param disabled    - If true disables the row.
 */
export function SettingsRow({
  icon, label, description, value, control, onClick, id, danger = false,
  badge, selected = false, disabled = false,
}: SettingsRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const iconContainerStyle: React.CSSProperties = danger
    ? {
        background: 'var(--md-sys-color-error-container)',
        color: 'var(--md-sys-color-on-error-container)',
        border: '1px solid var(--md-sys-color-error-border)',
      }
    : {
        background: 'var(--md-sys-color-surface-container)',
        color: 'var(--md-sys-color-primary)',
        border: '1px solid var(--md-sys-color-outline-variant)',
      };

  const handlePress = useCallback(async (event: React.MouseEvent) => {
    if (disabled) return;
    addRipple(event, (control ? containerRef.current : buttonRef.current));
    HapticService.selection();
    await onClick?.();
  }, [onClick, disabled, control]);

  if (control) {
    return (
      <div
        ref={containerRef}
        id={id}
        onClick={handlePress}
        role="listitem"
        className={`relative overflow-hidden w-full flex items-center justify-between gap-3 px-4 py-3.5 min-h-[56px] border-b last:border-b-0 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        style={{
          borderColor: 'var(--md-sys-color-outline-variant)',
          background: 'var(--md-sys-color-surface)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={iconContainerStyle}
          >
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="text-sm font-bold truncate"
              style={{ color: danger ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-on-surface)' }}
            >
              {label}
            </p>
            {description && (
              <p
                className="text-2xs mt-0.5 font-medium leading-snug"
                style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
              >
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 ml-2">{control}</div>
      </div>
    );
  }

  return (
    <button
      ref={buttonRef}
      id={id}
      type="button"
      onClick={handlePress}
      disabled={disabled}
      className={`relative overflow-hidden w-full flex items-center gap-3 px-4 py-3.5 text-left min-h-[56px] border-b last:border-b-0 transition-colors touch-manipulation ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      style={{
        borderColor: 'var(--md-sys-color-outline-variant)',
        background: 'var(--md-sys-color-surface)',
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={iconContainerStyle}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-bold truncate"
          style={{ color: danger ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-on-surface)' }}
        >
          {label}
        </p>
        {description && (
          <p
            className="text-2xs mt-0.5 font-medium leading-snug"
            style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
          >
            {description}
          </p>
        )}
      </div>
      {badge && (
        <span
          className="text-2xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{
            background: 'var(--md-sys-color-primary-container)',
            color: 'var(--md-sys-color-on-primary-container)',
          }}
        >
          {badge}
        </span>
      )}
      {value && (
        <span
          className="text-xs font-bold mr-1 flex-shrink-0"
          style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
        >
          {value}
        </span>
      )}
      {selected && (
        <CheckCircle2
          className="w-4 h-4 flex-shrink-0"
          style={{ color: 'var(--md-sys-color-primary)' }}
          strokeWidth={2.2}
        />
      )}
      {!selected && (
        <ChevronRight
          className="w-4 h-4 flex-shrink-0"
          strokeWidth={2}
          style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
        />
      )}
    </button>
  );
}

/* =============================================================================
   Toast Notification
   ============================================================================= */

interface ToastProps {
  readonly toast:     ToastMessage;
  readonly onDismiss: (id: string) => void;
}

const TOAST_ICON_MAP: Record<ToastSeverity, React.ReactNode> = {
  info:    <Info         className="w-4 h-4 flex-shrink-0" strokeWidth={2.2} style={{ color: 'var(--md-sys-color-primary)' }} />,
  success: <CheckCircle2 className="w-4 h-4 flex-shrink-0" strokeWidth={2.2} style={{ color: 'var(--md-sys-color-success)' }} />,
  warning: <AlertTriangle className="w-4 h-4 flex-shrink-0" strokeWidth={2.2} style={{ color: 'var(--md-sys-color-warning)' }} />,
  error:   <AlertCircle  className="w-4 h-4 flex-shrink-0" strokeWidth={2.2} style={{ color: 'var(--md-sys-color-error)' }} />,
};

const TOAST_SURFACE_MAP: Record<ToastSeverity, React.CSSProperties> = {
  info:    { background: 'var(--md-sys-color-surface-container-high)', color: 'var(--md-sys-color-on-surface)', borderColor: 'var(--md-sys-color-outline-variant)' },
  success: { background: 'var(--md-color-protected-surface)', color: 'var(--md-color-protected-text)', borderColor: 'var(--md-color-protected-border)' },
  warning: { background: 'var(--md-color-recovered-surface)', color: 'var(--md-color-recovered-text)', borderColor: 'var(--md-color-recovered-border)' },
  error:   { background: 'var(--md-sys-color-error-container)', color: 'var(--md-sys-color-on-error-container)', borderColor: 'var(--md-sys-color-error-border)' },
};

/**
 * Toast
 *
 * Compact notification chip with severity icon, message, and dismiss button.
 * Auto-sized with rounded-2xl shape, consistent with MD3 snackbar.
 *
 * @param toast     - ToastMessage object with id, severity, and message.
 * @param onDismiss - Callback to remove the toast from the container.
 */
export function Toast({ toast, onDismiss }: ToastProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-center gap-3 border rounded-2xl px-4 py-3 shadow-md animate-slide-down"
      style={TOAST_SURFACE_MAP[toast.severity]}
    >
      {TOAST_ICON_MAP[toast.severity]}
      <p className="flex-1 text-xs font-bold">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="opacity-70 hover:opacity-100 transition-opacity flex-shrink-0 p-1 rounded-lg"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" strokeWidth={2.2} />
      </button>
    </div>
  );
}

/**
 * ToastContainer
 *
 * Fixed top-layer stack of Toast components. Positioned at the top of the screen,
 * centered, with pointer-events passthrough on the container (not the toasts).
 *
 * @param toasts    - Array of active ToastMessage objects.
 * @param onDismiss - Callback to remove a toast by ID.
 */
export function ToastContainer({ toasts, onDismiss }: { readonly toasts: ToastMessage[]; readonly onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-16 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

/* =============================================================================
   Toggle Switch — Material 3 Switch with Haptic + Spring Animation
   ============================================================================= */

interface ToggleSwitchProps {
  readonly checked:  boolean;
  readonly onChange: (checked: boolean) => void | Promise<void>;
  readonly id?:      string;
  readonly label?:   string;
  readonly disabled?: boolean;
}

/**
 * ToggleSwitch
 *
 * Material 3 Switch component. Uses primary/surface-container-highest tokens.
 * Fires HapticService.toggle() on each change.
 * Thumb uses spring-soft easing for a physical click sensation.
 *
 * @param checked  - Controlled boolean state.
 * @param onChange - Callback with new boolean value.
 * @param id       - Input element ID.
 * @param label    - Accessible aria-label for the hidden checkbox input.
 * @param disabled - Disables the toggle when true.
 */
export function ToggleSwitch({ checked, onChange, id, label = 'Toggle', disabled = false }: ToggleSwitchProps) {
  const handleChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    HapticService.toggle();
    await onChange(event.target.checked);
  }, [onChange, disabled]);

  return (
    <label
      htmlFor={id}
      className={`relative inline-flex items-center ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        className="sr-only"
        aria-label={label}
      />
      {/* Track */}
      <div
        className="w-12 h-[26px] rounded-full relative flex items-center transition-colors duration-200"
        style={{
          backgroundColor: checked
            ? 'var(--md-sys-color-primary)'
            : 'var(--md-sys-color-surface-container-highest)',
          border: `2px solid ${checked ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline)'}`,
          transition: 'background-color 200ms var(--md-motion-easing-standard), border-color 200ms var(--md-motion-easing-standard)',
        }}
      >
        {/* Thumb */}
        <div
          className="absolute rounded-full shadow-sm"
          style={{
            width: checked ? '20px' : '16px',
            height: checked ? '20px' : '16px',
            backgroundColor: checked
              ? 'var(--md-sys-color-on-primary)'
              : 'var(--md-sys-color-outline)',
            transform: checked ? 'translateX(24px)' : 'translateX(3px)',
            transition: 'transform 220ms var(--md-motion-easing-spring-soft), width 160ms ease, height 160ms ease, background-color 200ms var(--md-motion-easing-standard)',
          }}
        />
      </div>
    </label>
  );
}

/* =============================================================================
   Floating Pill Button
   ============================================================================= */

interface FloatingPillProps {
  readonly label:   string;
  readonly icon:    React.ReactNode;
  readonly onClick: () => void;
  readonly id:      string;
  readonly bottom?: number;
  readonly right?:  number;
}

/**
 * FloatingPill
 *
 * Floating action pill button using primary tokens. Spring scale on press.
 * Fires HapticService.impact() on press.
 *
 * @param label  - Button text and aria-label.
 * @param icon   - Leading icon element.
 * @param onClick - Press callback.
 * @param id     - Unique element ID.
 * @param bottom - Bottom offset in pixels. Default 88.
 * @param right  - Right offset in pixels. Default 16.
 */
export function FloatingPill({ label, icon, onClick, id, bottom = 88, right = 16 }: FloatingPillProps) {
  const handlePress = useCallback(() => {
    HapticService.impact();
    onClick();
  }, [onClick]);

  return (
    <button
      type="button"
      id={id}
      onClick={handlePress}
      aria-label={label}
      className="floating-pill animate-scale-in touch-manipulation"
      style={{ bottom: `${bottom}px`, right: `${right}px` }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
