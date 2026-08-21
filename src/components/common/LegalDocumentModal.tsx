/**
 * LegalDocumentModal
 *
 * Full-height slide-up viewer for reading the Privacy Policy or Terms of Service.
 * Styled in clean Signal white aesthetic with smooth scrolling.
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
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-xl border border-[#E5E7EB] flex flex-col animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#E5E7EB] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[#2C6BED] shrink-0 border border-[#DBEAFE]" style={{ background: '#EEF2FF' }}>
              {document.title === 'Privacy Policy' ? (
                <ShieldCheck className="w-5 h-5" strokeWidth={2.2} />
              ) : (
                <FileText className="w-5 h-5" strokeWidth={2.2} />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111827]">
                {document.title}
              </h2>
              <p className="text-2xs text-[#6B7280] font-medium">
                Last updated: {document.lastUpdated}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F3F4F6] hover:bg-[#E5E7EB] flex items-center justify-center text-[#6B7280] hover:text-[#111827] transition-colors"
            aria-label="Close legal document"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Document Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs leading-relaxed text-[#4B5563] pr-1">
          <div className="p-3.5 rounded-xl border border-[#E5E7EB] font-medium text-[#111827]" style={{ background: '#F8F9FA' }}>
            {document.summary}
          </div>

          {document.sections.map((section, idx) => (
            <div key={`sec-${idx}`} className="space-y-1.5 pt-2">
              <h3 className="font-bold text-[#111827] text-xs">
                {section.heading}
              </h3>
              <p className="text-[#4B5563] leading-relaxed">
                {section.content}
              </p>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-[#E5E7EB] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-2xl text-white font-bold text-sm transition-colors shadow-xs"
            style={{ background: '#2C6BED' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
