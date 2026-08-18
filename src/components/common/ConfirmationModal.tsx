/**
 * ConfirmationModal
 *
 * Reusable confirmation dialog component for destructive or sensitive actions.
 * Renders a full-screen backdrop with a slide-up modal card.
 *
 * For standard confirmations (lock/logout): shows Cancel + Confirm buttons.
 * For destructive confirmations (wipe): requires user to type a confirmation
 * phrase before the Confirm button activates.
 *
 * Design: backdrop blur, reduced corner radii (8px max), no rounded excess.
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ConfirmationModalProps {
  /** Controls modal visibility */
  readonly isOpen: boolean;
  /** Modal heading text */
  readonly title: string;
  /** Explanatory body paragraph */
  readonly body: string;
  /** Label for the confirm action button */
  readonly confirmLabel: string;
  /** When true, applies red/danger styling to the confirm button */
  readonly isDangerous?: boolean;
  /**
   * When set, the confirm button is disabled until the user types this
   * exact phrase into the text input. Used for irreversible actions (wipe).
   */
  readonly requireTypedConfirmation?: string;
  /** Called when user confirms the action */
  readonly onConfirm: () => void;
  /** Called when user cancels or closes the modal */
  readonly onCancel: () => void;
}

/**
 * ConfirmationModal
 *
 * Renders a modal dialog requiring user confirmation before executing
 * sensitive or destructive operations.
 *
 * @param  isOpen                    - Whether the modal is visible.
 * @param  title                     - Heading text shown inside modal.
 * @param  body                      - Descriptive message below heading.
 * @param  confirmLabel              - Label for the confirm button.
 * @param  isDangerous               - Applies danger/red styling when true.
 * @param  requireTypedConfirmation  - If set, user must type this text to proceed.
 * @param  onConfirm                 - Callback on confirmation.
 * @param  onCancel                  - Callback on cancel/dismiss.
 * @validates  - If requireTypedConfirmation is set, typed input must match exactly.
 * @edge-cases - Pressing Escape key triggers onCancel.
 */
export function ConfirmationModal({
  isOpen,
  title,
  body,
  confirmLabel,
  isDangerous = false,
  requireTypedConfirmation,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const [typedValue, setTypedValue] = useState('');

  /* Reset typed value whenever modal opens */
  useEffect(() => {
    if (isOpen) setTypedValue('');
  }, [isOpen]);

  /* Escape key closes modal */
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
    /* Backdrop */
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={event => { if (event.target === event.currentTarget) onCancel(); }}
    >
      {/* Modal card */}
      <div
        className="w-full max-w-lg bg-white mx-0 mb-0 animate-slide-up"
        style={{ borderRadius: '8px 8px 0 0', padding: '24px 20px 32px' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h2
            id="confirm-modal-title"
            className="text-base font-bold text-content-primary leading-tight flex-1 pr-4"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded text-content-muted hover:text-content-primary hover:bg-surface-800 transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <p className="text-sm text-content-secondary leading-relaxed mb-5 font-medium">
          {body}
        </p>

        {/* Typed confirmation input */}
        {requireTypedConfirmation && (
          <div className="mb-5">
            <label
              htmlFor="confirm-type-input"
              className="block text-xs font-bold text-content-primary mb-1.5"
            >
              Type <span className="font-extrabold text-red-600">{requireTypedConfirmation}</span> to confirm
            </label>
            <input
              id="confirm-type-input"
              type="text"
              value={typedValue}
              onChange={e => setTypedValue(e.target.value)}
              placeholder={requireTypedConfirmation}
              className="input-field text-sm font-mono"
              autoComplete="off"
              spellCheck={false}
              autoFocus
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            id="confirm-modal-cancel-button"
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 text-sm font-bold text-content-primary bg-surface-800 border border-surface-600 transition-colors hover:bg-surface-700 active:scale-[0.98]"
            style={{ borderRadius: '6px' }}
          >
            Cancel
          </button>
          <button
            id="confirm-modal-confirm-button"
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={`flex-1 py-3 px-4 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ${
              isDangerous
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-accent hover:bg-accent/90'
            }`}
            style={{ borderRadius: '6px' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
