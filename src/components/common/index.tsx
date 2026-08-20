/**
 * Common UI Component Library
 *
 * Exports reusable, typed React components used throughout the application.
 * Styled in Anthropic Claude warm editorial aesthetic.
 * All technical and algorithmic jargon has been sanitized for consumer clarity.
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
} from 'lucide-react';
import type { ToastMessage, ToastSeverity } from '@/types';
export { ThreeSecurityCanvas } from './ThreeSecurityCanvas';
export { ConfirmationModal } from './ConfirmationModal';
export { LegalDocumentModal } from './LegalDocumentModal';
export { ColorModeModal, type ColorMode } from './ColorModeModal';
export { FontStyleModal, type FontStyle } from './FontStyleModal';

/* =============================================================
   Loading Spinner
   ============================================================= */

interface LoadingSpinnerProps {
  readonly size?: 'sm' | 'md' | 'lg';
  readonly className?: string;
}

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

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/* =============================================================
   Badge Components
   ============================================================= */

interface DeletedBadgeProps {
  readonly compact?: boolean;
}

export function DeletedBadge({ compact = false }: DeletedBadgeProps) {
  return (
    <span className="badge-deleted">
      <AlertTriangle className="w-3 h-3 text-[#9C5418]" strokeWidth={2.2} />
      {!compact && 'Deleted'}
    </span>
  );
}

export function RecoveredBadge() {
  return (
    <span className="badge-recovered">
      <Shield className="w-3 h-3 text-emerald-700" strokeWidth={2.2} />
      Recovered
    </span>
  );
}

/* =============================================================
   Search Input (Clean Claude Warm Input)
   ============================================================= */

interface SearchInputProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly id: string;
  readonly matchCount?: number;
  readonly algorithmLabel?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search messages...',
  id,
  matchCount,
}: SearchInputProps) {
  return (
    <div className="relative flex flex-col gap-1.5">
      <div className="relative">
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted pointer-events-none"
          strokeWidth={2}
        />
        <input
          id={id}
          type="search"
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={placeholder}
          className="search-bar pr-10"
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

      {value.length > 0 && matchCount !== undefined && (
        <div className="flex items-center justify-end px-1 text-2xs animate-fade-in font-medium text-content-muted">
          <span>
            {matchCount} match{matchCount !== 1 ? 'es' : ''} found
          </span>
        </div>
      )}
    </div>
  );
}

/* =============================================================
   Avatar / Contact Initials
   ============================================================= */

interface AvatarProps {
  readonly name:               string;
  readonly size?:              'sm' | 'md' | 'lg';
  readonly isGroup?:           boolean;
  readonly hasRecentDeletion?: boolean;
}

export function Avatar({ name, size = 'md', isGroup = false, hasRecentDeletion = false }: AvatarProps) {
  const sizeMap = { sm: 'w-8 h-8 text-xs', md: 'w-11 h-11 text-sm', lg: 'w-14 h-14 text-base' };
  const initials = name.trim().split(' ').slice(0, 2).map(word => word[0]).join('').toUpperCase();

  const bgClass = isGroup
    ? 'bg-accent-muted text-accent border-accent/30'
    : 'bg-surface-850 text-content-primary border-surface-700';

  return (
    <div
      className={`${sizeMap[size]} ${bgClass} rounded-2xl border flex items-center justify-center font-bold flex-shrink-0 select-none shadow-xs relative ${
        hasRecentDeletion ? 'ring-2 ring-accent ring-offset-1' : ''
      }`}
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

export function SectionDivider({ label }: SectionDividerProps) {
  if (!label) {
    return <hr className="border-surface-700 my-3" />;
  }
  return (
    <div className="flex items-center gap-3 my-4">
      <hr className="flex-1 border-surface-700" />
      <span className="text-2xs text-content-muted font-bold uppercase tracking-widest px-2.5 bg-surface-850 rounded-full py-0.5 border border-surface-700">
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

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-8 py-16 text-center animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-surface-850 border border-surface-700 shadow-card flex items-center justify-center text-accent">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="font-serif font-bold text-content-primary text-base tracking-tight">{title}</p>
        <p className="text-content-muted text-xs leading-relaxed max-w-[280px] font-medium">{description}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/* =============================================================
   List Row with Chevron or Control
   ============================================================= */

interface SettingsRowProps {
  readonly icon:         React.ReactNode;
  readonly label:        string;
  readonly description?: string;
  readonly value?:       string;
  readonly control?:     React.ReactNode;
  readonly onClick?:     () => void | Promise<any>;
  readonly id?:          string;
  readonly danger?:      boolean;
}

export function SettingsRow({ icon, label, description, value, control, onClick, id, danger = false }: SettingsRowProps) {
  if (control) {
    return (
      <div
        id={id}
        onClick={onClick}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 border-b border-surface-700 last:border-b-0 ${danger ? 'hover:bg-red-50' : 'hover:bg-surface-850'} transition-colors`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${danger ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-surface-850 text-accent border-surface-700'}`}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-xs sm:text-sm font-bold truncate ${danger ? 'text-rose-700' : 'text-content-primary'}`}>{label}</p>
            {description && <p className="text-2xs text-content-muted mt-0.5 font-medium leading-snug">{description}</p>}
          </div>
        </div>
        <div className="flex-shrink-0 ml-2">
          {control}
        </div>
      </div>
    );
  }

  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      className={`card-interactive w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-surface-700 last:border-b-0 rounded-none first:rounded-t-2xl last:rounded-b-2xl ${danger ? 'hover:bg-rose-50 hover:border-rose-200' : ''}`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${danger ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-surface-850 text-accent border-surface-700'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs sm:text-sm font-bold truncate ${danger ? 'text-rose-700' : 'text-content-primary'}`}>{label}</p>
        {description && <p className="text-2xs text-content-muted mt-0.5 font-medium leading-snug">{description}</p>}
      </div>
      {value && <span className="text-2xs text-content-secondary font-bold mr-1">{value}</span>}
      <ChevronRight className="w-4 h-4 text-content-muted flex-shrink-0" strokeWidth={2} />
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
  info:    <Info        className="w-4 h-4 text-accent"      strokeWidth={2.2} />,
  success: <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={2.2} />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-600"  strokeWidth={2.2} />,
  error:   <AlertCircle className="w-4 h-4 text-rose-600"   strokeWidth={2.2} />,
};

const toastBorderMap: Record<ToastSeverity, string> = {
  info:    'border-accent/30 bg-surface-900 text-content-primary',
  success: 'border-emerald-300 bg-emerald-50 text-emerald-950',
  warning: 'border-amber-300 bg-amber-50 text-amber-950',
  error:   'border-rose-300 bg-rose-50 text-rose-950',
};

export function Toast({ toast, onDismiss }: ToastProps) {
  return (
    <div
      role="alert"
      className={`flex items-center gap-3 border ${toastBorderMap[toast.severity]} rounded-2xl px-4 py-3 shadow-card animate-slide-up`}
    >
      {toastIconMap[toast.severity]}
      <p className="flex-1 text-xs font-bold">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="opacity-70 hover:opacity-100 transition-opacity flex-shrink-0 p-1"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" strokeWidth={2.2} />
      </button>
    </div>
  );
}

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
   Toggle Switch (Claude Terracotta Pill)
   ============================================================= */

interface ToggleSwitchProps {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void | Promise<any>;
  readonly id?: string;
  readonly label?: string;
  readonly disabled?: boolean;
}

export function ToggleSwitch({ checked, onChange, id, label = 'Toggle', disabled = false }: ToggleSwitchProps) {
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
        className={`w-11 h-6 rounded-full transition-all duration-180 relative flex items-center px-0.5 ${
          checked
            ? 'bg-accent'
            : 'bg-surface-600'
        }`}
      >
        <div
          className={`w-5 h-5 rounded-full bg-white transition-transform duration-180 shadow-xs ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </div>
    </label>
  );
}

/* =============================================================
   Floating Pill Button (Jump to Next Deleted)
   ============================================================= */

interface FloatingPillProps {
  readonly label:   string;
  readonly icon:    React.ReactNode;
  readonly onClick: () => void;
  readonly id:      string;
  readonly bottom?: number;
  readonly right?:  number;
}

export function FloatingPill({ label, icon, onClick, id, bottom = 88, right = 16 }: FloatingPillProps) {
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      aria-label={label}
      className="floating-pill animate-fade-in"
      style={{ bottom: `${bottom}px`, right: `${right}px` }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
