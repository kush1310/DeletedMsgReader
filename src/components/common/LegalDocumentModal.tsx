/**
 * LegalDocumentModal
 *
 * Full-height slide-up viewer for reading the Privacy Policy or Terms of Service.
 * Styled in Anthropic Claude editorial warm aesthetic with smooth scrolling.
 */

import { useEffect } from 'react';
import { X, ShieldCheck, FileText } from 'lucide-react';
import type { LegalDocument } from '@/data/legalContent';

export interface LegalDocumentModalProps {
  readonly isOpen: boolean;
  readonly document: LegalDocument | null;
  readonly onClose: () => void;
}

export function LegalDocumentModal({
  isOpen,
  document,
  onClose,
}: LegalDocumentModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !document) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] bg-surface-900 rounded-t-3xl sm:rounded-3xl p-6 shadow-card-lg border border-surface-700 flex flex-col animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-surface-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-muted flex items-center justify-center text-accent shrink-0">
              {document.title === 'Privacy Policy' ? (
                <ShieldCheck className="w-5 h-5" strokeWidth={2.2} />
              ) : (
                <FileText className="w-5 h-5" strokeWidth={2.2} />
              )}
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-content-primary">
                {document.title}
              </h2>
              <p className="text-2xs text-content-muted font-medium">
                Last updated: {document.lastUpdated}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-850 hover:bg-surface-700 flex items-center justify-center text-content-muted hover:text-content-primary transition-colors"
            aria-label="Close legal document"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Document Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs leading-relaxed text-content-secondary pr-1">
          <div className="p-3.5 rounded-xl bg-surface-850 border border-surface-700 font-medium text-content-primary">
            {document.summary}
          </div>

          {document.sections.map((section, idx) => (
            <div key={`sec-${idx}`} className="space-y-1.5 pt-2">
              <h3 className="font-bold text-content-primary text-xs">
                {section.heading}
              </h3>
              <p className="text-content-secondary leading-relaxed">
                {section.content}
              </p>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-surface-700 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="btn-neu-primary w-full py-2.5 font-bold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
