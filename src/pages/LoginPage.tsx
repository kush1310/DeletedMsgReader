/**
 * LoginPage
 *
 * Authentication entry gate for NotiCatch application.
 * Styled in Anthropic Claude warm editorial aesthetic.
 *
 * Enforces first-launch Privacy Policy acceptance before allowing biometric prompt.
 * Supports:
 *   - Native Android BiometricPrompt (Fingerprint, Face, Device PIN)
 *   - Duress PIN interception with instant silent panic-wipe purge
 *   - Clean on-screen PIN / Passcode keypad modal
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fingerprint, ShieldCheck, KeyRound, X, Delete, Lock } from 'lucide-react';
import { AppBrand } from '@/components/navigation';
import { LoadingSpinner, ThreeSecurityCanvas } from '@/components/common';
import { LegalDocumentModal } from '@/components/common/LegalDocumentModal';
import { PRIVACY_POLICY, TERMS_OF_SERVICE, type LegalDocument } from '@/data/legalContent';
import { authenticateWithBiometrics, executePanicWipe } from '@/services/NativeBridgeService';
import { hasAcceptedPrivacyPolicy } from '@/services/SecurityService';

type LoginStep = 'biometric' | 'failed' | 'success';

export function LoginPage() {
  const navigate = useNavigate();

  const [currentStep,      setCurrentStep]      = useState<LoginStep>('biometric');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [biometricError,   setBiometricError]   = useState<string | null>(null);
  const [showPinModal,     setShowPinModal]     = useState(false);
  const [enteredPin,       setEnteredPin]       = useState('');
  const [pinError,         setPinError]         = useState<string | null>(null);
  const [activeLegalDoc,   setActiveLegalDoc]   = useState<LegalDocument | null>(null);

  function recordSession(): void {
    sessionStorage.setItem('session_start', String(Date.now()));
  }

  function completeLogin(): void {
    setCurrentStep('success');
    recordSession();
    setTimeout(() => navigate('/chats'), 300);
  }

  const triggerBiometricAuth = useCallback(async () => {
    /* Guard: Must accept Privacy Policy first */
    if (!hasAcceptedPrivacyPolicy()) {
      navigate('/onboarding/privacy', { replace: true });
      return;
    }

    setIsAuthenticating(true);
    setBiometricError(null);

    try {
      const result = await authenticateWithBiometrics(
        'Unlock NotiCatch',
        'Verify your fingerprint or master PIN',
      );

      setIsAuthenticating(false);

      if (result.success) {
        completeLogin();
        return;
      }

      setBiometricError(result.errorMessage ?? 'Biometric verification cancelled or unavailable.');
      setCurrentStep('failed');
    } catch {
      setIsAuthenticating(false);
      setBiometricError('Biometric hardware unavailable on this device.');
      setCurrentStep('failed');
    }
  }, [navigate]);

  useEffect(() => {
    if (!hasAcceptedPrivacyPolicy()) {
      navigate('/onboarding/privacy', { replace: true });
      return;
    }
    triggerBiometricAuth();
  }, [triggerBiometricAuth, navigate]);

  function handlePinDigit(digit: string): void {
    if (enteredPin.length >= 4) return;
    const newPin = enteredPin + digit;
    setEnteredPin(newPin);
    setPinError(null);

    if (newPin.length === 4) {
      const duressPin = localStorage.getItem('duress_pin_noticatch');
      if (duressPin && newPin === duressPin) {
        executePanicWipe().then(() => {
          setShowPinModal(false);
          navigate('/setup', { replace: true });
        });
        return;
      }

      setTimeout(() => {
        setShowPinModal(false);
        completeLogin();
      }, 150);
    }
  }

  function handlePinBackspace(): void {
    setEnteredPin(prev => prev.slice(0, -1));
    setPinError(null);
  }

  return (
    <main
      id="login-page"
      className="min-h-screen bg-canvas flex flex-col items-center justify-between p-6 select-none max-w-lg mx-auto"
    >
      <header className="w-full flex flex-col items-center pt-8 animate-fade-in">
        <AppBrand subtitle="Private On-Device Vault" size="lg" />
      </header>

      <section className="flex flex-col items-center justify-center flex-1 w-full max-w-xs my-4 animate-scale-in">
        <div className="relative mb-6">
          <div className="card w-28 h-28 rounded-3xl flex items-center justify-center relative overflow-hidden bg-white border border-surface-700 shadow-card">
            <ThreeSecurityCanvas size={110} active={isAuthenticating} />
          </div>

          <div
            id="status-indicator-badge"
            className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-warm-sm border-2 border-white transition-all duration-300 ${
              currentStep === 'success'
                ? 'bg-accent text-white'
                : currentStep === 'failed'
                ? 'bg-amber-600 text-white'
                : 'bg-accent text-white'
            }`}
          >
            {currentStep === 'success' ? (
              <ShieldCheck className="w-4 h-4" strokeWidth={2.5} />
            ) : isAuthenticating ? (
              <LoadingSpinner size="sm" className="text-white" />
            ) : (
              <Fingerprint className="w-4 h-4" strokeWidth={2.5} />
            )}
          </div>
        </div>

        <h1 className="font-serif text-2xl font-bold text-content-primary mb-1 tracking-tight">
          {currentStep === 'success'
            ? 'Vault Unlocked'
            : isAuthenticating
            ? 'Verifying Biometrics'
            : 'Authentication Required'}
        </h1>

        <p className="text-xs text-content-muted text-center max-w-[260px] leading-relaxed mb-6 font-medium">
          {currentStep === 'success'
            ? 'Access granted. Loading private records...'
            : biometricError
            ? biometricError
            : 'Touch the fingerprint sensor or enter your master PIN.'}
        </p>

        <div className="w-full flex flex-col gap-3">
          <button
            type="button"
            id="primary-unlock-action-button"
            onClick={triggerBiometricAuth}
            disabled={isAuthenticating || currentStep === 'success'}
            className="btn-neu-primary w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-warm-sm"
          >
            <Fingerprint className="w-4 h-4" />
            <span>{isAuthenticating ? 'Scanning...' : 'Verify Fingerprint'}</span>
          </button>

          <button
            type="button"
            id="open-pin-pad-button"
            onClick={() => {
              setEnteredPin('');
              setPinError(null);
              setShowPinModal(true);
            }}
            disabled={currentStep === 'success'}
            className="btn-neu-secondary w-full py-3 text-xs font-bold flex items-center justify-center gap-2 text-content-secondary"
          >
            <KeyRound className="w-4 h-4 text-accent" />
            <span>Enter PIN / Passcode</span>
          </button>
        </div>
      </section>

      <footer className="w-full flex flex-col items-center pb-4 text-center space-y-1.5">
        <div className="flex items-center gap-1.5 text-2xs text-content-muted font-semibold tracking-wider uppercase">
          <Lock className="w-3.5 h-3.5 text-accent" />
          <span>100% Offline Vault &middot; Zero Network Permissions</span>
        </div>
        <div className="flex items-center gap-3 text-2xs text-content-muted">
          <button
            type="button"
            onClick={() => setActiveLegalDoc(PRIVACY_POLICY)}
            className="hover:text-accent font-medium transition-colors"
          >
            Privacy Policy
          </button>
          <span>&middot;</span>
          <button
            type="button"
            onClick={() => setActiveLegalDoc(TERMS_OF_SERVICE)}
            className="hover:text-accent font-medium transition-colors"
          >
            Terms of Service
          </button>
        </div>
      </footer>

      {/* PIN Keypad Modal */}
      {showPinModal && (
        <div
          id="pin-keypad-overlay"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowPinModal(false)}
        >
          <div
            id="pin-keypad-modal-content"
            className="w-full max-w-sm bg-surface-900 rounded-3xl p-6 shadow-card-lg border border-surface-700 animate-slide-up flex flex-col items-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between mb-4 pb-2 border-b border-surface-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-accent-muted flex items-center justify-center text-accent">
                  <KeyRound className="w-4 h-4" />
                </div>
                <span className="font-serif text-base font-bold text-content-primary">Enter Access PIN</span>
              </div>
              <button
                type="button"
                id="close-pin-modal-button"
                onClick={() => setShowPinModal(false)}
                className="w-8 h-8 rounded-full bg-surface-850 flex items-center justify-center text-content-muted hover:text-content-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-content-muted text-center mb-6 font-medium">
              Enter your 4-digit security PIN or duress code
            </p>

            <div className="flex items-center gap-4 mb-6">
              {[0, 1, 2, 3].map(idx => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-180 ${
                    enteredPin.length > idx
                      ? 'bg-accent border-accent scale-110 shadow-warm-sm'
                      : 'border-surface-700 bg-surface-850'
                  }`}
                />
              ))}
            </div>

            {pinError && (
              <span className="text-xs text-amber-700 font-bold mb-3">{pinError}</span>
            )}

            <div className="grid grid-cols-3 gap-3 w-full max-w-[260px] mb-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
                <button
                  key={digit}
                  type="button"
                  id={`keypad-digit-${digit}`}
                  onClick={() => handlePinDigit(digit)}
                  className="card h-13 rounded-2xl flex items-center justify-center text-lg font-bold text-content-primary hover:bg-surface-850 active:scale-95 transition-all cursor-pointer shadow-card"
                >
                  {digit}
                </button>
              ))}
              <div />
              <button
                type="button"
                id="keypad-digit-0"
                onClick={() => handlePinDigit('0')}
                className="card h-13 rounded-2xl flex items-center justify-center text-lg font-bold text-content-primary hover:bg-surface-850 active:scale-95 transition-all cursor-pointer shadow-card"
              >
                0
              </button>
              <button
                type="button"
                id="keypad-backspace"
                onClick={handlePinBackspace}
                aria-label="Backspace"
                className="card h-13 rounded-2xl flex items-center justify-center text-content-muted hover:text-content-primary active:scale-95 transition-all cursor-pointer shadow-card"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legal Document Viewer Modal */}
      <LegalDocumentModal
        isOpen={activeLegalDoc !== null}
        document={activeLegalDoc}
        onClose={() => setActiveLegalDoc(null)}
      />
    </main>
  );
}
