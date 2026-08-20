/**
 * PrivacySettingsPage.tsx
 *
 * Privacy and transparent data practices sub-page for NotiCatch.
 * Styled to precisely match Anthropic Claude's mobile Privacy screen.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ToggleSwitch, LegalDocumentModal } from '@/components/common';
import { PRIVACY_POLICY, TERMS_OF_SERVICE, type LegalDocument } from '@/data/legalContent';

export function PrivacySettingsPage() {
  const navigate = useNavigate();

  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocument | null>(null);
  const [modelTraining, setModelTraining] = useState(
    () => localStorage.getItem('privacy_model_training') !== 'false'
  );

  function handleToggleModelTraining(val: boolean): void {
    setModelTraining(val);
    localStorage.setItem('privacy_model_training', String(val));
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF9F5] text-content-primary">
      {/* Top App Bar */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-[#FAF9F5]/90 backdrop-blur-md border-b border-[#E8E4D8] pt-safe">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            type="button"
            id="privacy-back-button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-content-primary hover:bg-surface-850 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2} />
          </button>
          <h1 className="font-serif text-lg font-bold text-content-primary tracking-tight">
            Privacy
          </h1>
          <div className="w-9" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-20 pb-12 px-6 max-w-lg mx-auto w-full space-y-6 animate-slide-up">
        {/* Section 1: Data Privacy */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-content-primary">
            Data Privacy
          </h2>
          <p className="text-sm font-medium text-content-primary leading-relaxed">
            Anthropic believes in transparent data practices
          </p>
          <p className="text-xs text-content-muted leading-relaxed font-medium">
            Keeping your data safe is a priority. Learn how your information is protected when using Anthropic products, and visit our{' '}
            <button
              type="button"
              onClick={() => setActiveLegalDoc(TERMS_OF_SERVICE)}
              className="text-accent underline font-semibold hover:opacity-80"
            >
              Privacy Center
            </button>{' '}
            and{' '}
            <button
              type="button"
              onClick={() => setActiveLegalDoc(PRIVACY_POLICY)}
              className="text-accent underline font-semibold hover:opacity-80"
            >
              Privacy Policy
            </button>{' '}
            for more details.
          </p>
        </section>

        <div className="border-t border-[#E8E4D8]" />

        {/* Section 2: Help improve our AI models */}
        <section className="space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-content-primary">
                Help improve our AI models
              </h2>
              <p className="text-xs text-content-muted leading-relaxed font-medium">
                Allow the use of your chats and coding sessions to train and improve Anthropic AI models.
              </p>
              <button
                type="button"
                onClick={() => setActiveLegalDoc(PRIVACY_POLICY)}
                className="text-xs text-accent underline font-semibold hover:opacity-80 block pt-0.5"
              >
                Learn More
              </button>
            </div>
            <ToggleSwitch
              id="toggle-model-training"
              checked={modelTraining}
              onChange={handleToggleModelTraining}
            />
          </div>
        </section>
      </main>

      {/* Offline Legal Document Modal Viewer */}
      {activeLegalDoc && (
        <LegalDocumentModal
          isOpen={true}
          document={activeLegalDoc}
          onClose={() => setActiveLegalDoc(null)}
        />
      )}
    </div>
  );
}
