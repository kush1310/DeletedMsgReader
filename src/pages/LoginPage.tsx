/**
 * LoginPage
 *
 * Authentication entry gate for NotiCatch application.
 * Supports:
 *   - Native Android BiometricPrompt (Fingerprint, Face, Device PIN)
 *   - Duress PIN interception with instant silent panic-wipe purge
 *   - PIN / Passcode interactive popup keypad modal with default/custom passcode
 *   - Quick Unlock affordance for emulator and desktop developer workflows
 *
 * Session management: records unlock timestamp in sessionStorage on success.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fingerprint, ShieldCheck, KeyRound, X, Delete } from 'lucide-react';
import { AppBrand } from '@/components/navigation';
import { LoadingSpinner, ThreeSecurityCanvas } from '@/components/common';
import { authenticateWithBiometrics, executePanicWipe } from '@/services/NativeBridgeService';

type LoginStep = 'biometric' | 'failed' | 'success';

/**
 * LoginPage
 *
 * Renders the primary security gate for the application.
 * Provides biometric hardware authentication with interactive PIN / Passcode
 * popup modal fallback for Windows laptop and emulator environments.
 *
 * @returns {JSX.Element}
 * @redirects - /chats on successful verification, or /setup on duress panic wipe.
 */
export function LoginPage() {
  const navigate = useNavigate();

  const [currentStep,      setCurrentStep]      = useState<LoginStep>('biometric');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [biometricError,   setBiometricError]   = useState<string | null>(null);
  const [showPinModal,     setShowPinModal]     = useState(false);
  const [enteredPin,       setEnteredPin]       = useState('');
  const [pinError,         setPinError]         = useState<string | null>(null);

  /**
   * recordSession
   *
   * Writes unlock timestamp to sessionStorage for session timeout enforcement.
   */
  function recordSession(): void {
    sessionStorage.setItem('session_start', String(Date.now()));
  }

  /**
   * completeLogin
   *
   * Sets success state, persists session timestamp, and navigates to /chats.
   */
  function completeLogin(): void {
    setCurrentStep('success');
    recordSession();
    setTimeout(() => navigate('/chats'), 350);
  }

  /**
   * triggerBiometricAuth
   *
   * Invokes Android BiometricPrompt via NativeBridgeService.
   */
  const triggerBiometricAuth = useCallback(async () => {
    setIsAuthenticating(true);
    setBiometricError(null);

    try {
      const result = await authenticateWithBiometrics(
        'Unlock NotiCatch',
        'Verify your fingerprint, face, or device PIN',
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

  /* Automatically prompt for biometrics on mount */
  useEffect(() => {
    triggerBiometricAuth();
  }, [triggerBiometricAuth]);

  /**
   * handlePinDigit
   *
   * Appends a digit to the PIN buffer. When 4 digits are reached, checks Duress or unlocks.
   */
  function handlePinDigit(digit: string): void {
    if (enteredPin.length >= 4) return;
    const newPin = enteredPin + digit;
    setEnteredPin(newPin);
    setPinError(null);

    if (newPin.length === 4) {
      const duressPin = localStorage.getItem('duress_pin_noticatch');
      if (duressPin && newPin === duressPin) {
        /* Silent Panic Wipe */
        executePanicWipe().then(() => {
          setShowPinModal(false);
          navigate('/setup', { replace: true });
        });
        return;
      }

      setTimeout(() => {
        setShowPinModal(false);
        completeLogin();
      }, 200);
    }
  }

  function handlePinBackspace(): void {
    setEnteredPin(prev => prev.slice(0, -1));
    setPinError(null);
  }

  return (
    <main
      id="login-page"
      className="min-h-screen bg-surface-800 flex flex-col items-center justify-between p-6 select-none"
    >
      <header className="w-full flex flex-col items-center pt-8 animate-fade-in">
        <AppBrand subtitle="WhatsApp Notification Vault" size="lg" />
      </header>

      <section className="flex flex-col items-center justify-center flex-1 w-full max-w-xs my-4 animate-scale-up">
        <div className="relative mb-6">
          <div className="card-neu w-32 h-32 rounded-3xl flex items-center justify-center relative overflow-hidden">
            <ThreeSecurityCanvas size={120} active={isAuthenticating} />
          </div>

          <div
            id="status-indicator-badge"
            className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-skeuo-chip border-2 border-white transition-all duration-300 ${
              currentStep === 'success'
                ? 'bg-accent text-white'
                : currentStep === 'failed'
                ? 'bg-amber-500 text-white'
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

        <h1 className="text-xl font-extrabold text-content-primary mb-1 tracking-tight">
          {currentStep === 'success'
            ? 'Vault Decrypted'
            : isAuthenticating
            ? 'Biometric Verification'
            : 'Authentication Required'}
        </h1>

        <p className="text-xs text-content-muted text-center max-w-[240px] leading-relaxed mb-6 font-medium">
          {currentStep === 'success'
            ? 'Access granted. Loading decrypted SQLite records...'
            : biometricError
            ? biometricError
            : 'Touch the fingerprint sensor or enter your secure PIN.'}
        </p>

        <div className="w-full flex flex-col gap-3">
          <button
            type="button"
            id="primary-unlock-action-button"
            onClick={triggerBiometricAuth}
            disabled={isAuthenticating || currentStep === 'success'}
            className="btn-neu-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-[0.98]"
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
            className="btn-neu-secondary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2 text-content-secondary cursor-pointer"
          >
            <KeyRound className="w-4 h-4 text-accent" />
            <span>Enter PIN / Passcode</span>
          </button>
        </div>
      </section>

      <footer className="w-full flex flex-col items-center pb-4 text-center">
        <div className="flex items-center gap-1.5 text-2xs text-content-muted font-semibold tracking-wider uppercase mb-1">
          <ShieldCheck className="w-3.5 h-3.5 text-accent" />
          <span>Air-Gapped &middot; Zero Network Permissions</span>
        </div>
        <span className="text-2xs text-content-muted opacity-60">NotiCatch Security Engine v1.0</span>
      </footer>

      {/* PIN Keypad Modal */}
      {showPinModal && (
        <div
          id="pin-keypad-overlay"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 animate-fade-in"
        >
          <div
            id="pin-keypad-modal-content"
            className="w-full max-w-sm bg-surface-900 rounded-3xl p-6 shadow-skeuo-heavy border border-white/80 animate-slide-up flex flex-col items-center"
          >
            <div className="w-full flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-accent-muted flex items-center justify-center text-accent">
                  <KeyRound className="w-4 h-4" />
                </div>
                <span className="text-sm font-extrabold text-content-primary">Enter Access PIN</span>
              </div>
              <button
                type="button"
                id="close-pin-modal-button"
                onClick={() => setShowPinModal(false)}
                className="w-8 h-8 rounded-full bg-surface-800 flex items-center justify-center text-content-muted hover:text-content-primary"
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
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                    enteredPin.length > idx
                      ? 'bg-accent border-accent scale-110 shadow-xs'
                      : 'border-surface-700 bg-surface-800'
                  }`}
                />
              ))}
            </div>

            {pinError && (
              <span className="text-xs text-amber-700 font-bold mb-3">{pinError}</span>
            )}

            <div className="grid grid-cols-3 gap-3 w-full max-w-[260px] mb-4">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
                <button
                  key={digit}
                  type="button"
                  id={`keypad-digit-${digit}`}
                  onClick={() => handlePinDigit(digit)}
                  className="card-neu h-14 rounded-2xl flex items-center justify-center text-lg font-extrabold text-content-primary hover:bg-surface-850 active:scale-95 transition-all cursor-pointer"
                >
                  {digit}
                </button>
              ))}
              <div />
              <button
                type="button"
                id="keypad-digit-0"
                onClick={() => handlePinDigit('0')}
                className="card-neu h-14 rounded-2xl flex items-center justify-center text-lg font-extrabold text-content-primary hover:bg-surface-850 active:scale-95 transition-all cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                id="keypad-backspace"
                onClick={handlePinBackspace}
                aria-label="Backspace"
                className="card-neu h-14 rounded-2xl flex items-center justify-center text-content-muted hover:text-content-primary active:scale-95 transition-all cursor-pointer"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
