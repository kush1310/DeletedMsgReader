/**
 * ConfirmationModal
 *
 * Reusable bottom-sheet confirmation dialog for destructive or sensitive actions.
 *
 * Renders a full-screen scrim with a slide-up bottom sheet card.
 * Danger variant shows error-container surface and error-styled confirm button.
 * Optional typed confirmation input for irreversible actions (panic wipe).
 *
 * Haptic:
 *   - Cancel: HapticService.tap()
 *   - Confirm (safe): HapticService.impact()
 *   - Confirm (danger): HapticService.deleteAction()
 *   - Escape key: HapticService.tap()
 */

import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import { HapticService } from '@/services/HapticService';

export interface ConfirmationModalProps {
  readonly isOpen:                    boolean;
  readonly title:                     string;
  readonly body?:                     string;
  readonly description?:              string;
  readonly confirmLabel:              string;
  readonly cancelLabel?:              string;
  readonly isDangerous?:              boolean;
  readonly confirmVariant?:           'danger' | 'primary' | 'secondary';
  readonly isLoading?:                boolean;
  readonly requireTypedConfirmation?: string;
  readonly onConfirm:                 () => void;
  readonly onCancel:                  () => void;
}

/**
 * ConfirmationModal
 *
 * Bottom-sheet confirmation dialog with Material 3 tonal surface and
 * semantic tokens for light/dark theme compatibility.
 *
 * @param isOpen                    - Controls visibility.
 * @param title                     - Modal heading.
 * @param body / description        - Explanatory body text.
 * @param confirmLabel              - Confirm button label.
 * @param cancelLabel               - Cancel button label. Defaults to 'Cancel'.
 * @param isDangerous               - If true renders destructive styling.
 * @param confirmVariant            - 'danger', 'primary', or 'secondary'.
 * @param isLoading                 - Shows spinner during async confirm action.
 * @param requireTypedConfirmation  - If set, user must type this exact string.
 * @param onConfirm                 - Confirm callback.
 * @param onCancel                  - Cancel / dismiss callback.
 */
export function ConfirmationModal({
  isOpen,
  title,
  body,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
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
      if (event.key === 'Escape' && isOpen) {
        HapticService.tap();
        onCancel();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  const handleCancel = useCallback(() => {
    HapticService.tap();
    onCancel();
  }, [onCancel]);

  const handleConfirm = useCallback(() => {
    if (isDanger) {
      HapticService.deleteAction();
    } else {
      HapticService.impact();
    }
    onConfirm();
  }, [isDanger, onConfirm]);

  if (!isOpen) return null;

  const confirmDisabled = requireTypedConfirmation
    ? typedValue !== requireTypedConfirmation
    : false;

  const confirmBtnStyle = isDanger
    ? {
        background: 'var(--md-sys-color-error)',
        color: 'var(--md-sys-color-on-error)',
      }
    : {
        background: 'var(--md-sys-color-primary)',
        color: 'var(--md-sys-color-on-primary)',
      };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in"
      style={{ backgroundColor: 'var(--md-sys-color-scrim)' }}
      onClick={event => { if (event.target === event.currentTarget) handleCancel(); }}
    >
      <div
        className="w-full max-w-lg animate-sheet-up"
        style={{
          background: 'var(--md-sys-color-surface-container-low)',
          borderRadius: '28px 28px 0 0',
          padding: '1.5rem 1.5rem max(1.5rem, env(safe-area-inset-bottom)) 1.5rem',
          border: '1px solid var(--md-sys-color-outline-variant)',
          borderBottom: 'none',
          boxShadow: 'var(--md-elevation-5)',
        }}
      >
        {/* Drag handle */}
        <div className="bottom-sheet-handle" />

        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5 flex-1 pr-4">
            {isDanger && (
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'var(--md-sys-color-error-container)',
                  color: 'var(--md-sys-color-error)',
                }}
              >
                <AlertTriangle className="w-4 h-4" strokeWidth={2.2} />
              </div>
            )}
            <h2
              id="confirm-modal-title"
              className="text-base font-extrabold leading-tight"
              style={{ color: isDanger ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-on-surface)' }}
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="w-9 h-9 flex items-center justify-center rounded-full transition-colors flex-shrink-0"
            style={{
              background: 'var(--md-sys-color-surface-container-high)',
              color: 'var(--md-sys-color-on-surface-variant)',
            }}
            aria-label="Close"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {displayMessage && (
          <p
            className="text-sm leading-relaxed mb-4 font-medium"
            style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
          >
            {displayMessage}
          </p>
        )}

        {requireTypedConfirmation && (
          <div className="mb-4">
            <label
              htmlFor="typed-confirm-input"
              className="block text-2xs font-bold mb-1.5 uppercase tracking-wider"
              style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
            >
              Type{' '}
              <span
                className="font-extrabold"
                style={{ color: 'var(--md-sys-color-error)' }}
              >
                {requireTypedConfirmation}
              </span>{' '}
              to confirm:
            </label>
            <input
              id="typed-confirm-input"
              type="text"
              value={typedValue}
              onChange={event => setTypedValue(event.target.value)}
              placeholder={requireTypedConfirmation}
              className="input-field text-xs font-semibold"
              autoComplete="off"
            />
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="btn-secondary flex-1 min-h-[48px] text-sm"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirmDisabled || isLoading}
            className="flex-1 min-h-[48px] text-sm font-extrabold flex items-center justify-center gap-1.5 rounded-full transition-all active:scale-95 disabled:opacity-40"
            style={confirmBtnStyle}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
