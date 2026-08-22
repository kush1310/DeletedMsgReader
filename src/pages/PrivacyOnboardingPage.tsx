/**
 * PrivacyOnboardingPage
 *
 * First-launch mandatory legal agreement and privacy architecture overview.
 * Styled with Material 3 semantic tokens, standalone theme support, and haptics.
 * Users must explicitly agree to terms before accessing the vault.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, HardDrive, WifiOff, Lock, ArrowRight } from 'lucide-react';
import { LegalDocumentModal } from '@/components/common/LegalDocumentModal';
import { PRIVACY_POLICY, TERMS_OF_SERVICE, type LegalDocument } from '@/data/legalContent';
import { setAcceptedPrivacyPolicy } from '@/services/SecurityService';
import { HapticService } from '@/services/HapticService';

export function PrivacyOnboardingPage() {
  const navigate = useNavigate();
  const [activeDoc, setActiveDoc] = useState<LegalDocument | null>(null);

  function handleAgree() {
    HapticService.success();
    setAcceptedPrivacyPolicy(true);
    navigate('/login', { replace: true });
  }

  return (
    <div
      className="min-h-screen flex flex-col justify-between p-6 max-w-lg mx-auto"
      style={{
        background: 'var(--md-sys-color-background)',
        color: 'var(--md-sys-color-on-surface)',
      }}
    >
      {/* Header Section */}
      <div className="pt-8 space-y-3 text-center sm:text-left">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto sm:mx-0 border"
          style={{
            background: 'var(--md-sys-color-primary-container)',
            borderColor: 'var(--md-sys-color-outline-variant)',
            color: 'var(--md-sys-color-primary)',
          }}
        >
          <ShieldCheck className="w-6 h-6" strokeWidth={2.2} />
        </div>
        <h1
          className="text-2xl sm:text-3xl font-bold tracking-tight"
          style={{ color: 'var(--md-sys-color-on-surface)' }}
        >
          Your Privacy & Data Vault
        </h1>
        <p
          className="text-xs sm:text-sm font-medium leading-relaxed"
          style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
        >
          NotiCatch is engineered to operate 100% offline on your device with complete privacy.
        </p>
      </div>

      {/* Feature Cards */}
      <div className="py-6 space-y-3">
        <div
          className="p-4 rounded-2xl border flex items-start gap-3.5 shadow-xs"
          style={{
            background: 'var(--md-sys-color-surface)',
            borderColor: 'var(--md-sys-color-outline-variant)',
          }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
            style={{
              background: 'var(--md-sys-color-surface-container)',
              borderColor: 'var(--md-sys-color-outline-variant)',
              color: 'var(--md-sys-color-primary)',
            }}
          >
            <HardDrive className="w-4 h-4" strokeWidth={2} />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>100% Local Storage</h3>
            <p className="text-2xs leading-relaxed" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
              All messages are saved into your private on-device SQLite database. Nothing ever leaves your phone.
            </p>
          </div>
        </div>

        <div
          className="p-4 rounded-2xl border flex items-start gap-3.5 shadow-xs"
          style={{
            background: 'var(--md-sys-color-surface)',
            borderColor: 'var(--md-sys-color-outline-variant)',
          }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
            style={{
              background: 'var(--md-sys-color-surface-container)',
              borderColor: 'var(--md-sys-color-outline-variant)',
              color: 'var(--md-sys-color-primary)',
            }}
          >
            <WifiOff className="w-4 h-4" strokeWidth={2} />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Zero Network Permissions</h3>
            <p className="text-2xs leading-relaxed" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
              The app has zero internet permissions. It is architecturally impossible to send data to any cloud.
            </p>
          </div>
        </div>

        <div
          className="p-4 rounded-2xl border flex items-start gap-3.5 shadow-xs"
          style={{
            background: 'var(--md-sys-color-surface)',
            borderColor: 'var(--md-sys-color-outline-variant)',
          }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
            style={{
              background: 'var(--md-sys-color-surface-container)',
              borderColor: 'var(--md-sys-color-outline-variant)',
              color: 'var(--md-sys-color-primary)',
            }}
          >
            <Lock className="w-4 h-4" strokeWidth={2} />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Device Security Vault</h3>
            <p className="text-2xs leading-relaxed" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
              Protected by your phone's native screen lock and biometrics. Complete control with 1-tap data export and panic wipe.
            </p>
          </div>
        </div>
      </div>

      {/* Footer & Action */}
      <div
        className="space-y-4 pt-4 pb-2 border-t"
        style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}
      >
        <p className="text-2xs text-center leading-relaxed" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
          By continuing, you acknowledge and agree to our{' '}
          <button
            type="button"
            onClick={() => {
              HapticService.tap();
              setActiveDoc(PRIVACY_POLICY);
            }}
            className="font-bold underline"
            style={{ color: 'var(--md-sys-color-primary)' }}
          >
            Privacy Policy
          </button>{' '}
          and{' '}
          <button
            type="button"
            onClick={() => {
              HapticService.tap();
              setActiveDoc(TERMS_OF_SERVICE);
            }}
            className="font-bold underline"
            style={{ color: 'var(--md-sys-color-primary)' }}
          >
            Terms of Service
          </button>
          .
        </p>

        <button
          type="button"
          id="btn-agree-privacy"
          onClick={handleAgree}
          className="btn-primary w-full text-xs font-bold flex items-center justify-center gap-2 min-h-[48px]"
        >
          <span>Agree & Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Legal Doc Modal */}
      <LegalDocumentModal
        isOpen={activeDoc !== null}
        document={activeDoc}
        onClose={() => setActiveDoc(null)}
      />
    </div>
  );
}
