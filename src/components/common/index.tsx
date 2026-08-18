/**
 * Common UI Component Library
 *
 * Exports reusable, typed React components used throughout the application.
 * All components use Tailwind utility classes from the NotiCatch Light Design System
 * with Neumorphic and Skeuomorphic tactile finishes.
 * Lucide React icons are used exclusively — no emojis or AI-generated icons.
 */

import React from 'react';
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
  Zap,
} from 'lucide-react';
import type { ToastMessage, ToastSeverity } from '@/types';
export { ThreeSecurityCanvas } from './ThreeSecurityCanvas';

/* =============================================================
   Loading Spinner
   ============================================================= */

interface LoadingSpinnerProps {
  readonly size?: 'sm' | 'md' | 'lg';
  readonly className?: string;
}

/**
 * LoadingSpinner
 *
 * Displays an animated Lucide Loader2 spinner with configurable size.
 */
export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeMap = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <Loader2
      className={`animate-spin text-accent ${sizeMap[size]} ${className}`}
      aria-label="Loading"
    />
  );
}

/* =============================================================
   Skeleton Loader
   ============================================================= */

interface SkeletonProps {
  readonly className?: string;
}

/**
 * Skeleton
 *
 * Animated shimmer placeholder for content that is loading.
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/* =============================================================
   Badge Components
   ============================================================= */

interface DeletedBadgeProps {
  readonly compact?: boolean;
}

/**
 * DeletedBadge
 *
 * Displays the "DELETED" warning tag with skeuomorphic gloss.
 */
export function DeletedBadge({ compact = false }: DeletedBadgeProps) {
  return (
    <span className="badge-deleted">
      <AlertTriangle className="w-3 h-3 text-amber-700" strokeWidth={2.5} />
      {!compact && 'Deleted'}
    </span>
  );
}

/**
 * RecoveredBadge
 *
 * Displays the "RECOVERED" accent tag.
 */
export function RecoveredBadge() {
  return (
    <span className="badge-recovered">
      <Shield className="w-3 h-3 text-emerald-700" strokeWidth={2.5} />
      Recovered
    </span>
  );
}

/* =============================================================
   Search Input (Debossed Neumorphic with Algorithm Badge)
   ============================================================= */

interface SearchInputProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly id: string;
  readonly matchCount?: number;
  readonly algorithmLabel?: string;
}

/**
 * SearchInput
 *
 * Neumorphic debossed search bar featuring Boyer-Moore-Horspool algorithm acceleration.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search messages (Boyer-Moore-Horspool accelerated)...',
  id,
  matchCount,
  algorithmLabel = 'Boyer-Moore-Horspool O(n/m)',
}: SearchInputProps) {
  return (
    <div className="relative flex flex-col gap-1.5">
      <div className="relative">
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted pointer-events-none"
          strokeWidth={2.2}
        />
        <input
          id={id}
          type="search"
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={placeholder}
          className="search-bar pr-24"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-primary p-1"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2.2} />
          </button>
        )}
      </div>

      {value.length > 0 && (
        <div className="flex items-center justify-between px-1 text-2xs animate-fade-in font-medium">
          <span className="flex items-center gap-1 text-accent font-bold">
            <Zap className="w-3 h-3 text-accent" strokeWidth={2.2} />
            {algorithmLabel}
          </span>
          {matchCount !== undefined && (
            <span className="text-content-secondary font-semibold">
              {matchCount} match{matchCount !== 1 ? 'es' : ''} found
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* =============================================================
   Avatar / Contact Initials with Tactile Depth
   ============================================================= */

interface AvatarProps {
  readonly name: string;
  readonly size?: 'sm' | 'md' | 'lg';
  readonly isGroup?: boolean;
}

/**
 * Avatar
 *
 * Renders contact initials with skeuomorphic bevel and shadow.
 */
export function Avatar({ name, size = 'md', isGroup = false }: AvatarProps) {
  const sizeMap = { sm: 'w-8 h-8 text-xs', md: 'w-11 h-11 text-sm', lg: 'w-14 h-14 text-base' };
  const initials = name.trim().split(' ').slice(0, 2).map(word => word[0]).join('').toUpperCase();

  const colorIndex = name.charCodeAt(0) % 6;
  const bgColors = [
    'bg-gradient-to-b from-teal-50 to-teal-100 text-teal-900 border-teal-300',
    'bg-gradient-to-b from-emerald-50 to-emerald-100 text-emerald-900 border-emerald-300',
    'bg-gradient-to-b from-sky-50 to-sky-100 text-sky-900 border-sky-300',
    'bg-gradient-to-b from-indigo-50 to-indigo-100 text-indigo-900 border-indigo-300',
    'bg-gradient-to-b from-amber-50 to-amber-100 text-amber-900 border-amber-300',
    'bg-gradient-to-b from-slate-100 to-slate-200 text-slate-900 border-slate-300',
  ];
  const bgClass = isGroup ? 'bg-gradient-to-b from-emerald-100 to-emerald-200 text-emerald-950 border-emerald-400' : bgColors[colorIndex];

  return (
    <div
      className={`${sizeMap[size]} ${bgClass} rounded-2xl border flex items-center justify-center font-extrabold flex-shrink-0 select-none shadow-skeuo-chip`}
      aria-label={`Avatar for ${name}`}
    >
      {initials}
    </div>
  );
}

/* =============================================================
   Section Divider
   ============================================================= */

interface SectionDividerProps {
  readonly label?: string;
}

/**
 * SectionDivider
 *
 * Horizontal rule with an optional centered text label.
 */
export function SectionDivider({ label }: SectionDividerProps) {
  if (!label) {
    return <hr className="border-surface-700 my-3" />;
  }
  return (
    <div className="flex items-center gap-3 my-4">
      <hr className="flex-1 border-surface-700" />
      <span className="text-2xs text-content-muted font-bold uppercase tracking-widest px-2.5 bg-surface-800 rounded-lg py-0.5 border border-surface-700/60 shadow-skeuo-chip">
        {label}
      </span>
      <hr className="flex-1 border-surface-700" />
    </div>
  );
}

/* =============================================================
   Empty State Illustration
   ============================================================= */

interface EmptyStateProps {
  readonly icon: React.ReactNode;
  readonly title: string;
  readonly description: string;
  readonly action?: React.ReactNode;
}

/**
 * EmptyState
 *
 * Full-panel empty state display with tactile card styling.
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-8 py-16 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-3xl bg-surface-900 border border-white shadow-neu-flat flex items-center justify-center text-accent">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="font-bold text-content-primary text-base tracking-tight">{title}</p>
        <p className="text-content-muted text-sm leading-relaxed max-w-[280px] font-medium">{description}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/* =============================================================
   List Row with Chevron
   ============================================================= */

interface SettingsRowProps {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly description?: string;
  readonly value?: string;
  readonly onClick?: () => void;
  readonly id: string;
  readonly danger?: boolean;
}

/**
 * SettingsRow
 *
 * Tappable settings list row with neumorphic surface.
 */
export function SettingsRow({ icon, label, description, value, onClick, id, danger = false }: SettingsRowProps) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      className={`card-interactive w-full flex items-center gap-3 px-4 py-3.5 text-left ${danger ? 'hover:bg-red-50 hover:border-red-200' : ''}`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-skeuo-chip border border-white/80 ${danger ? 'bg-red-100 text-red-700' : 'bg-surface-800 text-accent'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold truncate ${danger ? 'text-red-700' : 'text-content-primary'}`}>{label}</p>
        {description && <p className="text-xs text-content-muted mt-0.5 font-medium">{description}</p>}
      </div>
      {value && <span className="text-xs text-content-secondary font-bold mr-1">{value}</span>}
      <ChevronRight className="w-4 h-4 text-content-muted flex-shrink-0" strokeWidth={2.2} />
    </button>
  );
}

/* =============================================================
   Toast Notification
   ============================================================= */

interface ToastProps {
  readonly toast: ToastMessage;
  readonly onDismiss: (id: string) => void;
}

const toastIconMap: Record<ToastSeverity, React.ReactNode> = {
  info:    <Info        className="w-4 h-4 text-sky-600"     strokeWidth={2.2} />,
  success: <CheckCircle2 className="w-4 h-4 text-emerald"    strokeWidth={2.2} />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-600" strokeWidth={2.2} />,
  error:   <AlertCircle className="w-4 h-4 text-red-600"     strokeWidth={2.2} />,
};

const toastBorderMap: Record<ToastSeverity, string> = {
  info:    'border-sky-300 bg-gradient-to-b from-sky-50 to-sky-100 text-sky-950',
  success: 'border-emerald-300 bg-gradient-to-b from-emerald-50 to-emerald-100 text-emerald-950',
  warning: 'border-amber-300 bg-gradient-to-b from-amber-50 to-amber-100 text-amber-950',
  error:   'border-red-300 bg-gradient-to-b from-red-50 to-red-100 text-red-950',
};

/**
 * Toast
 *
 * Single toast notification card with tactile gloss.
 */
export function Toast({ toast, onDismiss }: ToastProps) {
  return (
    <div
      role="alert"
      className={`flex items-center gap-3 border ${toastBorderMap[toast.severity]} rounded-2xl px-4 py-3.5 shadow-card-lg animate-slide-up`}
    >
      {toastIconMap[toast.severity]}
      <p className="flex-1 text-sm font-bold">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="opacity-70 hover:opacity-100 transition-opacity flex-shrink-0 p-1"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" strokeWidth={2.2} />
      </button>
    </div>
  );
}

/**
 * ToastContainer
 */
export function ToastContainer({ toasts, onDismiss }: { readonly toasts: ToastMessage[]; readonly onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

/* =============================================================
   Toggle Switch (Neumorphic Tactile Pill)
   ============================================================= */

interface ToggleSwitchProps {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
}

/**
 * ToggleSwitch
 *
 * Tactile skeuomorphic switch with convex thumb.
 */
export function ToggleSwitch({ checked, onChange, id, label, disabled = false }: ToggleSwitchProps) {
  return (
    <label htmlFor={id} className={`relative inline-flex items-center ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        disabled={disabled}
        className="sr-only"
        aria-label={label}
      />
      <div
        className={`w-12 h-6 rounded-full border transition-all duration-200 ease-spring relative flex items-center px-0.5 ${
          checked
            ? 'bg-gradient-to-r from-[#00A884] to-[#008069] border-[#006A57] shadow-sm'
            : 'bg-surface-700 border-surface-600 shadow-inner'
        }`}
      >
        <div
          className={`w-5 h-5 rounded-full bg-white shadow-md border border-slate-200/80 transition-transform duration-200 ease-spring ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </div>
    </label>
  );
}
