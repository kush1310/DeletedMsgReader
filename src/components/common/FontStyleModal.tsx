/**
 * FontStyleModal.tsx
 *
 * Modal dialog for selecting typography font style (Default Serif vs System Sans).
 * Styled to precisely match Anthropic Claude's mobile settings dialog.
 */

import { Check, Sparkles, Type } from 'lucide-react';

export type FontStyle = 'default' | 'system';

interface FontStyleModalProps {
  readonly isOpen: boolean;
  readonly currentStyle: FontStyle;
  readonly onSelect: (style: FontStyle) => void;
  readonly onClose: () => void;
}

export function FontStyleModal({
  isOpen,
  currentStyle,
  onSelect,
  onClose,
}: FontStyleModalProps) {
  if (!isOpen) return null;

  const options: Array<{ style: FontStyle; label: string; icon: typeof Sparkles }> = [
    { style: 'default', label: 'Default', icon: Sparkles },
    { style: 'system',  label: 'System',  icon: Type },
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
          Font style
        </h3>

        <div className="space-y-1">
          {options.map(({ style, label, icon: Icon }) => {
            const isSelected = currentStyle === style;
            return (
              <button
                key={style}
                type="button"
                id={`font-style-option-${style}`}
                onClick={() => {
                  onSelect(style);
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
