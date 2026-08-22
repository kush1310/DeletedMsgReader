/**
 * PrivacySettingsPage.tsx
 *
 * Privacy and transparent data practices sub-page for NotiCatch.
 * Styled with Material 3 semantic tokens, standalone theme support, and haptics.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Lock } from 'lucide-react';
import { TopAppBar, IconButton } from '@/components/navigation';
import { ToggleSwitch, LegalDocumentModal } from '@/components/common';
import { PRIVACY_POLICY, TERMS_OF_SERVICE, type LegalDocument } from '@/data/legalContent';
import { HapticService } from '@/services/HapticService';

export function PrivacySettingsPage() {
  const navigate = useNavigate();

  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocument | null>(null);
  const [localAnalytics, setLocalAnalytics] = useState(
    () => localStorage.getItem('privacy_local_analytics') === 'true'
  );

  function handleToggleLocalAnalytics(val: boolean): void {
    HapticService.selection();
    setLocalAnalytics(val);
    localStorage.setItem('privacy_local_analytics', String(val));
  }

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{
        background: 'var(--md-sys-color-background)',
        color: 'var(--md-sys-color-on-surface)',
      }}
    >
      {/* Top App Bar */}
      <TopAppBar
        title="Privacy & Data"
        subtitle="On-Device Air-Gap Architecture"
        leading={
          <IconButton
            id="privacy-back-button"
            icon={<ArrowLeft className="w-5 h-5" style={{ color: 'var(--md-sys-color-on-surface)' }} strokeWidth={2} />}
            label="Back"
            onClick={() => {
              HapticService.navigate();
              navigate(-1);
            }}
          />
        }
      />

      {/* Main Content */}
      <main className="flex-1 pt-20 pb-12 px-6 max-w-lg mx-auto w-full space-y-6 animate-slide-up">
        {/* Section 1: Data Privacy */}
        <section
          className="p-5 rounded-2xl border shadow-xs space-y-3"
          style={{
            background: 'var(--md-sys-color-surface)',
            borderColor: 'var(--md-sys-color-outline-variant)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border"
              style={{
                background: 'var(--md-sys-color-primary-container)',
                borderColor: 'var(--md-sys-color-outline-variant)',
                color: 'var(--md-sys-color-primary)',
              }}
            >
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>
              100% Air-Gapped Privacy
            </h2>
          </div>
          <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--md-sys-color-on-surface)' }}>
            NotiCatch operates with zero internet permissions.
          </p>
          <p className="text-xs leading-relaxed font-medium" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
            All WhatsApp notifications and recovered deleted messages are saved solely to your device's encrypted Room SQLite database. No external servers or cloud services are contacted.
          </p>
          <div className="pt-2 flex items-center gap-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                HapticService.tap();
                setActiveLegalDoc(PRIVACY_POLICY);
              }}
              style={{ color: 'var(--md-sys-color-primary)' }}
              className="underline"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => {
                HapticService.tap();
                setActiveLegalDoc(TERMS_OF_SERVICE);
              }}
              style={{ color: 'var(--md-sys-color-primary)' }}
              className="underline"
            >
              Terms of Service
            </button>
          </div>
        </section>

        {/* Section 2: Local Diagnostic Metrics */}
        <section
          className="p-5 rounded-2xl border shadow-xs space-y-3"
          style={{
            background: 'var(--md-sys-color-surface)',
            borderColor: 'var(--md-sys-color-outline-variant)',
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <h2 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>
                On-device diagnostics logging
              </h2>
              <p className="text-xs leading-relaxed font-medium" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
                Keep an on-device audit log of notification parser performance and storage health.
              </p>
            </div>
            <ToggleSwitch
              id="toggle-local-analytics"
              checked={localAnalytics}
              onChange={handleToggleLocalAnalytics}
              label="On-device diagnostics logging"
            />
          </div>
        </section>

        {/* Section 3: Panic Wipe Notice */}
        <section
          className="p-4 rounded-2xl border space-y-1.5"
          style={{
            background: 'var(--md-sys-color-surface-container)',
            borderColor: 'var(--md-sys-color-outline-variant)',
          }}
        >
          <div className="flex items-center gap-1.5 text-2xs font-semibold" style={{ color: 'var(--md-sys-color-primary)' }}>
            <Lock className="w-3.5 h-3.5" />
            <span>Emergency Erasure</span>
          </div>
          <p className="text-xs leading-relaxed font-medium" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
            You can permanently wipe all stored messages, encryption keys, and preferences anytime via the Panic Wipe button in Settings.
          </p>
        </section>
      </main>

      {/* Legal Document Modal */}
      <LegalDocumentModal
        isOpen={activeLegalDoc !== null}
        document={activeLegalDoc}
        onClose={() => setActiveLegalDoc(null)}
      />
    </div>
  );
}
