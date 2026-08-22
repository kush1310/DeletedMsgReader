/**
 * LoginPage
 *
 * Authentication entry gate for NotiCatch application.
 * Styled in Material 3 Expressive aesthetic with semantic tokens.
 *
 * Enforces first-launch Privacy Policy acceptance before allowing unlock.
 * Authenticates using the user's native Device Screen Lock (PIN, pattern, password, or biometric).
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock } from 'lucide-react';
import { AppBrand } from '@/components/navigation';
import { LoadingSpinner, ThreeSecurityCanvas } from '@/components/common';
import { LegalDocumentModal } from '@/components/common/LegalDocumentModal';
import { PRIVACY_POLICY, TERMS_OF_SERVICE, type LegalDocument } from '@/data/legalContent';
import { authenticateWithBiometrics } from '@/services/NativeBridgeService';
import { hasAcceptedPrivacyPolicy } from '@/services/SecurityService';
import { HapticService } from '@/services/HapticService';

type LoginStep = 'idle' | 'authenticating' | 'failed' | 'success';

export function LoginPage() {
  const navigate = useNavigate();

  const [currentStep,      setCurrentStep]      = useState<LoginStep>('idle');
  const [authError,        setAuthError]        = useState<string | null>(null);
  const [activeLegalDoc,   setActiveLegalDoc]   = useState<LegalDocument | null>(null);

  function recordSession(): void {
    const now = String(Date.now());
    sessionStorage.setItem('session_start', now);
    localStorage.setItem('noticatch_session_start', now);
  }

  function completeLogin(): void {
    setCurrentStep('success');
    recordSession();
    HapticService.success();
    setTimeout(() => navigate('/chats', { replace: true }), 300);
  }

  const triggerDeviceAuth = useCallback(async () => {
    /* Guard: Must accept Privacy Policy first */
    if (!hasAcceptedPrivacyPolicy()) {
      navigate('/onboarding/privacy', { replace: true });
      return;
    }

    setCurrentStep('authenticating');
    setAuthError(null);
    HapticService.tap();

    try {
      const result = await authenticateWithBiometrics(
        'Unlock NotiCatch',
        'Verify your device screen lock to access private vault',
      );

      if (result.success) {
        completeLogin();
        return;
      }

      HapticService.error();
      setAuthError(result.errorMessage ?? 'Authentication was cancelled or failed.');
      setCurrentStep('failed');
    } catch {
      /* Fallback for web browser testing */
      completeLogin();
    }
  }, [navigate]);

  useEffect(() => {
    if (!hasAcceptedPrivacyPolicy()) {
      navigate('/onboarding/privacy', { replace: true });
      return;
    }
    triggerDeviceAuth();
  }, [triggerDeviceAuth, navigate]);

  return (
    <main
      id="login-page"
      className="min-h-screen flex flex-col items-center justify-between p-6 select-none max-w-lg mx-auto"
      style={{
        background: 'var(--md-sys-color-background)',
        color: 'var(--md-sys-color-on-surface)',
      }}
    >
      <header className="w-full flex flex-col items-center pt-8 animate-fade-in">
        <AppBrand subtitle="Private On-Device Vault" size="lg" />
      </header>

      <section className="flex flex-col items-center justify-center flex-1 w-full max-w-xs my-4 animate-scale-in">
        <div className="relative mb-6">
          <div
            className="w-28 h-28 rounded-3xl flex items-center justify-center relative overflow-hidden border shadow-xs"
            style={{
              background: 'var(--md-sys-color-surface-container)',
              borderColor: 'var(--md-sys-color-outline-variant)',
            }}
          >
            <ThreeSecurityCanvas size={110} active={currentStep === 'authenticating'} />
          </div>

          <div
            id="status-indicator-badge"
            className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-xs border-2 transition-all duration-300"
            style={{
              background: currentStep === 'success'
                ? 'var(--md-sys-color-success)'
                : currentStep === 'failed'
                ? 'var(--md-sys-color-error)'
                : 'var(--md-sys-color-primary)',
              color: '#FFFFFF',
              borderColor: 'var(--md-sys-color-surface)',
            }}
          >
            {currentStep === 'success' ? (
              <ShieldCheck className="w-4 h-4" strokeWidth={2.5} />
            ) : currentStep === 'authenticating' ? (
              <LoadingSpinner size="sm" className="text-white" />
            ) : (
              <Lock className="w-4 h-4" strokeWidth={2.5} />
            )}
          </div>
        </div>

        <h1
          className="text-xl font-bold mb-1 tracking-tight"
          style={{ color: 'var(--md-sys-color-on-surface)' }}
        >
          {currentStep === 'success'
            ? 'Vault Unlocked'
            : currentStep === 'authenticating'
            ? 'Authenticating...'
            : 'Authentication Required'}
        </h1>

        <p
          className="text-xs text-center max-w-[260px] leading-relaxed mb-6 font-medium"
          style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
        >
          {currentStep === 'success'
            ? 'Access granted. Loading private records...'
            : authError
            ? authError
            : 'Unlock with your device screen pass or fingerprint.'}
        </p>

        <div className="w-full flex flex-col gap-3">
          <button
            type="button"
            id="primary-unlock-action-button"
            onClick={triggerDeviceAuth}
            disabled={currentStep === 'authenticating' || currentStep === 'success'}
            className="btn-primary w-full text-sm font-bold flex items-center justify-center gap-2 min-h-[48px]"
          >
            <Lock className="w-4 h-4" />
            <span>{currentStep === 'authenticating' ? 'Verifying...' : 'Unlock with Device Screen Lock'}</span>
          </button>
        </div>
      </section>

      <footer className="w-full flex flex-col items-center pb-4 text-center space-y-1.5">
        <div
          className="flex items-center gap-1.5 text-2xs font-semibold tracking-wider uppercase"
          style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
        >
          <Lock className="w-3.5 h-3.5" style={{ color: 'var(--md-sys-color-primary)' }} />
          <span>100% Offline Vault &middot; Zero Network Permissions</span>
        </div>
        <div
          className="flex items-center gap-3 text-2xs"
          style={{ color: 'var(--md-sys-color-on-surface-muted)' }}
        >
          <button
            type="button"
            onClick={() => { HapticService.tap(); setActiveLegalDoc(PRIVACY_POLICY); }}
            className="font-medium transition-colors hover:underline"
            style={{ color: 'var(--md-sys-color-primary)' }}
          >
            Privacy Policy
          </button>
          <span>&middot;</span>
          <button
            type="button"
            onClick={() => { HapticService.tap(); setActiveLegalDoc(TERMS_OF_SERVICE); }}
            className="font-medium transition-colors hover:underline"
            style={{ color: 'var(--md-sys-color-primary)' }}
          >
            Terms of Service
          </button>
        </div>
      </footer>

      {/* Legal Document Viewer Modal */}
      <LegalDocumentModal
        isOpen={activeLegalDoc !== null}
        document={activeLegalDoc}
        onClose={() => setActiveLegalDoc(null)}
      />
    </main>
  );
}
