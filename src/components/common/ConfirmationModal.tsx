/**
 * ConfirmationModal
 *
 * Reusable confirmation dialog component for destructive or sensitive actions.
 * Renders a full-screen backdrop with a slide-up modal card.
 */

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

export interface ConfirmationModalProps {
  readonly isOpen:                    boolean;
  readonly title:                     string;
  readonly body?:                     string;
  readonly description?:              string;
  readonly confirmLabel:              string;
  readonly cancelLabel?:               string;
  readonly isDangerous?:              boolean;
  readonly confirmVariant?:           'danger' | 'primary' | 'secondary';
  readonly isLoading?:                boolean;
  readonly requireTypedConfirmation?: string;
  readonly onConfirm:                 () => void;
  readonly onCancel:                  () => void;
}

export function ConfirmationModal({
  isOpen,
  title,
  body,
  description,
  confirmLabel,
  isDangerous = false,
  confirmVariant = 'primary',
  isLoading = false,
  requireTypedConfirmation,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const [typedValue, setTypedValue] = useState('');

  const displayMessage = description ?? body ?? '';
  const isDanger = isDangerous || confirmVariant === 'danger';

  useEffect(() => {
    if (isOpen) setTypedValue('');
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape' && isOpen) onCancel();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const confirmDisabled = requireTypedConfirmation
    ? typedValue !== requireTypedConfirmation
    : false;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-xs animate-fade-in"
      onClick={event => { if (event.target === event.currentTarget) onCancel(); }}
    >
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl p-6 shadow-skeuo-heavy border border-white/80 animate-slide-up"
      >
        <div className="flex items-start justify-between mb-3">
          <h2
            id="confirm-modal-title"
            className="text-base font-extrabold text-content-primary leading-tight flex-1 pr-4"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-800 text-content-muted hover:text-content-primary transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {displayMessage && (
          <p className="text-xs text-content-secondary leading-relaxed mb-4 font-medium">
            {displayMessage}
          </p>
        )}

        {requireTypedConfirmation && (
          <div className="mb-4">
            <label
              htmlFor="typed-confirm-input"
              className="block text-2xs font-bold text-content-secondary mb-1.5 uppercase tracking-wider"
            >
              Type <span className="font-extrabold text-red-700">{requireTypedConfirmation}</span> to confirm:
            </label>
            <input
              id="typed-confirm-input"
              type="text"
              value={typedValue}
              onChange={event => setTypedValue(event.target.value)}
              placeholder={requireTypedConfirmation}
              className="w-full text-xs font-semibold px-3 py-2 border rounded-lg border-surface-700 bg-surface-850 focus:border-red-500"
              autoComplete="off"
            />
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="btn-neu-secondary flex-1 py-2.5 text-xs font-bold text-content-secondary"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled || isLoading}
            className={`flex-1 py-2.5 text-xs font-extrabold flex items-center justify-center gap-1.5 rounded-xl transition-all shadow-xs ${
              isDanger
                ? 'bg-rose-700 text-white hover:bg-rose-800 disabled:opacity-50'
                : 'bg-accent text-white hover:bg-accent-hover disabled:opacity-50'
            }`}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
