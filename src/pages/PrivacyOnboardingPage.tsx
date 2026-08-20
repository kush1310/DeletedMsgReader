/**
 * PrivacyOnboardingPage
 *
 * First-launch mandatory legal agreement and privacy architecture overview.
 * Styled in Anthropic Claude warm editorial aesthetic.
 * Users must explicitly agree to terms before configuring master credentials.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, HardDrive, WifiOff, Lock, ArrowRight } from 'lucide-react';
import { LegalDocumentModal } from '@/components/common/LegalDocumentModal';
import { PRIVACY_POLICY, TERMS_OF_SERVICE, type LegalDocument } from '@/data/legalContent';
import { setAcceptedPrivacyPolicy } from '@/services/SecurityService';

export function PrivacyOnboardingPage() {
  const navigate = useNavigate();
  const [activeDoc, setActiveDoc] = useState<LegalDocument | null>(null);

  function handleAgree() {
    setAcceptedPrivacyPolicy(true);
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-between p-6 max-w-lg mx-auto">
      {/* Header Section */}
      <div className="pt-8 space-y-3 text-center sm:text-left">
        <div className="w-12 h-12 rounded-2xl bg-accent-muted flex items-center justify-center text-accent mx-auto sm:mx-0 shadow-warm-sm">
          <ShieldCheck className="w-6 h-6" strokeWidth={2.2} />
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-content-primary tracking-tight">
          Your Privacy & Data Vault
        </h1>
        <p className="text-xs sm:text-sm text-content-secondary font-medium leading-relaxed">
          NotiCatch is engineered to operate 100% offline on your device with complete privacy.
        </p>
      </div>

      {/* Feature Cards */}
      <div className="py-6 space-y-3">
        <div className="card p-4 flex items-start gap-3.5 shadow-card">
          <div className="w-9 h-9 rounded-xl bg-surface-850 flex items-center justify-center text-accent shrink-0 border border-surface-700">
            <HardDrive className="w-4 h-4" strokeWidth={2} />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold text-content-primary">100% Local Storage</h3>
            <p className="text-2xs text-content-muted leading-relaxed">
              All messages are saved into your private on-device SQLite database. Nothing ever leaves your phone.
            </p>
          </div>
        </div>

        <div className="card p-4 flex items-start gap-3.5 shadow-card">
          <div className="w-9 h-9 rounded-xl bg-surface-850 flex items-center justify-center text-accent shrink-0 border border-surface-700">
            <WifiOff className="w-4 h-4" strokeWidth={2} />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold text-content-primary">Zero Network Permissions</h3>
            <p className="text-2xs text-content-muted leading-relaxed">
              The app has zero internet permissions. It is architecturally impossible to send data to any cloud.
            </p>
          </div>
        </div>

        <div className="card p-4 flex items-start gap-3.5 shadow-card">
          <div className="w-9 h-9 rounded-xl bg-surface-850 flex items-center justify-center text-accent shrink-0 border border-surface-700">
            <Lock className="w-4 h-4" strokeWidth={2} />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold text-content-primary">Biometric Vault</h3>
            <p className="text-2xs text-content-muted leading-relaxed">
              Protected by your fingerprint and master recovery PIN. Complete control with 1-tap data export and panic wipe.
            </p>
          </div>
        </div>
      </div>

      {/* Footer & Action */}
      <div className="space-y-4 pt-4 pb-2 border-t border-surface-700">
        <p className="text-2xs text-content-muted text-center leading-relaxed">
          By continuing, you acknowledge and agree to our{' '}
          <button
            type="button"
            onClick={() => setActiveDoc(PRIVACY_POLICY)}
            className="text-accent font-bold hover:underline"
          >
            Privacy Policy
          </button>{' '}
          and{' '}
          <button
            type="button"
            onClick={() => setActiveDoc(TERMS_OF_SERVICE)}
            className="text-accent font-bold hover:underline"
          >
            Terms of Service
          </button>
          .
        </p>

        <button
          type="button"
          id="agree-continue-btn"
          onClick={handleAgree}
          className="btn-neu-primary w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-warm-md"
        >
          <span>Agree & Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Legal Document Viewer Modal */}
      <LegalDocumentModal
        isOpen={activeDoc !== null}
        document={activeDoc}
        onClose={() => setActiveDoc(null)}
      />
    </div>
  );
}
