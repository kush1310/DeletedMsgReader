/**
 * ColorModeModal.tsx
 *
 * Modal dialog for selecting color mode (System, Light, Dark).
 * Styled to precisely match Anthropic Claude's mobile settings dialog.
 */

import { Check, Smartphone, Sun, Moon } from 'lucide-react';

export type ColorMode = 'system' | 'light' | 'dark';

interface ColorModeModalProps {
  readonly isOpen: boolean;
  readonly currentMode: ColorMode;
  readonly onSelect: (mode: ColorMode) => void;
  readonly onClose: () => void;
}

export function ColorModeModal({
  isOpen,
  currentMode,
  onSelect,
  onClose,
}: ColorModeModalProps) {
  if (!isOpen) return null;

  const options: Array<{ mode: ColorMode; label: string; icon: typeof Smartphone }> = [
    { mode: 'system', label: 'System', icon: Smartphone },
    { mode: 'light',  label: 'Light',  icon: Sun },
    { mode: 'dark',   label: 'Dark',   icon: Moon },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs bg-white rounded-3xl p-5 shadow-card-lg border border-surface-700 animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-content-primary mb-4 px-1">
          Color mode
        </h3>

        <div className="space-y-1">
          {options.map(({ mode, label, icon: Icon }) => {
            const isSelected = currentMode === mode;
            return (
              <button
                key={mode}
                type="button"
                id={`color-mode-option-${mode}`}
                onClick={() => {
                  onSelect(mode);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-3 rounded-2xl text-left transition-colors ${
                  isSelected ? 'bg-surface-850 text-content-primary' : 'text-content-secondary hover:bg-surface-850'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Icon className="w-5 h-5 text-content-secondary" strokeWidth={2} />
                  <span className="text-sm font-semibold text-content-primary">{label}</span>
                </div>
                {isSelected && (
                  <Check className="w-4 h-4 text-accent" strokeWidth={2.5} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
