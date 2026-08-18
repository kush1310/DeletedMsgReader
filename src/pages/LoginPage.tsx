/**
 * LoginPage
 *
 * Biometric / PIN authentication entry screen for NotiCatch.
 * On native Android: attempts BiometricPrompt immediately on mount.
 * On web preview: skips biometric and shows PIN entry directly.
 *
 * Session management: records unlock timestamp in sessionStorage on success.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fingerprint, KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { AppBrand } from '@/components/navigation';
import { LoadingSpinner, ThreeSecurityCanvas } from '@/components/common';
import { authenticateWithBiometrics, isNativeAndroid } from '@/services/NativeBridgeService';

type LoginStep = 'biometric' | 'pin' | 'success';

/** Hardcoded dev PIN for web preview — in production, PIN is verified by Kotlin layer */
const DEV_WEB_PIN = '123456';

/**
 * LoginPage
 *
 * Renders the authentication gate for NotiCatch.
 * Biometric is attempted automatically on Android native.
 * PIN fallback is always available and is the primary method on web.
 *
 * @redirects - /chats on successful authentication.
 * @redirects - /setup if first launch (handled by App.tsx session guard).
 */
export function LoginPage() {
  const navigate = useNavigate();

  const native = isNativeAndroid();

  const [currentStep,      setCurrentStep]      = useState<LoginStep>(native ? 'biometric' : 'pin');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [biometricError,   setBiometricError]   = useState<string | null>(null);
  const [pinValue,         setPinValue]         = useState('');
  const [pinVisible,       setPinVisible]       = useState(false);
  const [pinError,         setPinError]         = useState<string | null>(null);

  /**
   * recordSession
   *
   * Writes unlock timestamp to sessionStorage so App.tsx can enforce
   * session timeout across route changes.
   */
  function recordSession(): void {
    sessionStorage.setItem('session_start', String(Date.now()));
  }

  /**
   * triggerBiometricAuth
   *
   * Invokes the Android BiometricPrompt via NativeBridgeService.
   * On success: records session and navigates to /chats.
   * On failure: transitions to PIN fallback.
   *
   * @validates - Only called on native Android (native flag check guards web).
   */
  const triggerBiometricAuth = useCallback(async () => {
    if (!native) return;
    setIsAuthenticating(true);
    setBiometricError(null);

    const result = await authenticateWithBiometrics(
      'Unlock NotiCatch',
      'Use biometrics to access your saved WhatsApp notifications',
    );

    setIsAuthenticating(false);

    if (result.success) {
      setCurrentStep('success');
      recordSession();
      setTimeout(() => navigate('/chats'), 500);
    } else {
      setBiometricError(result.errorMessage ?? 'Biometric authentication failed.');
      setCurrentStep('pin');
    }
  }, [native, navigate]);

  /* Auto-attempt biometric on native mount */
  useEffect(() => {
    if (native) {
      triggerBiometricAuth();
    }
  }, [native, triggerBiometricAuth]);

  /**
   * handlePinChange
   *
   * Strips non-digit characters and enforces 6-digit maximum length.
   *
   * @param  rawValue  - Raw input value from the PIN input element.
   */
  function handlePinChange(rawValue: string): void {
    const digitsOnly = rawValue.replace(/\D/g, '').substring(0, 6);
    setPinValue(digitsOnly);
    setPinError(null);
  }

  /**
   * handlePinSubmit
   *
   * Validates the entered PIN against the stored value.
   * On native: delegates validation to Kotlin layer (future implementation).
   * On web: compares against DEV_WEB_PIN for development testing only.
   *
   * @validates - Exactly 6 digits required.
   * @redirects - /chats on successful PIN validation.
   * @edge-cases - Displays error for wrong PIN without revealing correct value.
   */
  function handlePinSubmit(event: React.FormEvent): void {
    event.preventDefault();

    if (pinValue.length !== 6) {
      setPinError('PIN must be exactly 6 digits.');
      return;
    }

    if (!native && pinValue !== DEV_WEB_PIN) {
      setPinError(`Incorrect PIN. (Web preview: use ${DEV_WEB_PIN})`);
      return;
    }

    setCurrentStep('success');
    recordSession();
    setTimeout(() => navigate('/chats'), 500);
  }

  return (
    <main className="min-h-screen bg-surface-800 flex flex-col items-center justify-between px-6 py-safe">

      <div className="flex-1 flex flex-col items-center justify-center gap-7 w-full max-w-sm">

        {/* 3D WebGL Interactive Security Core */}
        <div className="flex flex-col items-center gap-2 animate-fade-in text-center">
          <div className="w-24 h-24 rounded-2xl bg-surface-900 border border-white shadow-neu-flat flex items-center justify-center relative overflow-hidden">
            <ThreeSecurityCanvas size={96} active={isAuthenticating || currentStep === 'biometric'} />
          </div>
          <AppBrand className="mt-2" />
          <p className="text-content-muted text-xs max-w-[260px] font-semibold leading-relaxed">
            WhatsApp Notification Saver & Deleted Message Recovery
          </p>
        </div>

        {/* Authentication card */}
        <div className="w-full space-y-4 animate-slide-up delay-150">

          {/* Biometric authenticating state (native only) */}
          {currentStep === 'biometric' && native && (
            <div className="card-neu flex flex-col items-center gap-4 py-8 px-6 text-center">
              {isAuthenticating ? (
                <>
                  <LoadingSpinner size="lg" />
                  <p className="text-content-secondary text-sm font-bold">Verifying biometric...</p>
                </>
              ) : (
                <>
                  <Fingerprint className="w-14 h-14 text-accent animate-pulse-soft" strokeWidth={1.8} />
                  <p className="text-content-primary text-sm font-extrabold">Touch fingerprint sensor to unlock</p>
                </>
              )}
              {biometricError && (
                <p className="text-xs text-red-600 font-bold text-center px-4" role="alert">{biometricError}</p>
              )}
            </div>
          )}

          {/* PIN entry form */}
          {currentStep === 'pin' && (
            <form onSubmit={handlePinSubmit} className="card p-5 space-y-4 shadow-neu-flat">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-800 flex items-center justify-center shadow-skeuo-chip border border-white">
                  <KeyRound className="w-5 h-5 text-accent" strokeWidth={2.2} />
                </div>
                <div>
                  <p className="text-sm font-bold text-content-primary">Enter your PIN</p>
                  <p className="text-xs text-content-muted font-medium">
                    {native ? 'Biometric failed — enter 6-digit PIN' : 'Web preview — PIN: 123456'}
                  </p>
                </div>
              </div>

              <div className="relative">
                <input
                  id="pin-input"
                  type={pinVisible ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pinValue}
                  onChange={event => handlePinChange(event.target.value)}
                  placeholder="------"
                  maxLength={6}
                  className="input-field pr-12 text-center text-2xl tracking-[0.5em] font-mono font-bold shadow-neu-inset"
                  autoFocus
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setPinVisible(!pinVisible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-primary transition-colors p-1"
                  aria-label={pinVisible ? 'Hide PIN' : 'Show PIN'}
                >
                  {pinVisible
                    ? <EyeOff className="w-5 h-5" strokeWidth={2} />
                    : <Eye    className="w-5 h-5" strokeWidth={2} />
                  }
                </button>
              </div>

              {pinError && (
                <p className="text-xs text-red-600 font-bold" role="alert">{pinError}</p>
              )}

              <button
                id="pin-submit-button"
                type="submit"
                disabled={pinValue.length !== 6}
                className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                Unlock NotiCatch
              </button>
            </form>
          )}

          {/* Success transition */}
          {currentStep === 'success' && (
            <div className="card-neu flex flex-col items-center gap-4 py-8 animate-scale-in text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center shadow-skeuo-chip">
                <ShieldCheck className="w-8 h-8 text-emerald" strokeWidth={2.2} />
              </div>
              <p className="text-content-primary font-bold text-base">Security Verified</p>
            </div>
          )}

          {/* Retry biometric link (only on native after fallback to PIN) */}
          {currentStep === 'pin' && native && (
            <p className="text-center text-sm text-content-muted font-semibold">
              <button
                id="retry-biometric-link"
                type="button"
                onClick={triggerBiometricAuth}
                className="text-accent hover:underline transition-colors font-bold"
              >
                Try biometrics again
              </button>
            </p>
          )}
        </div>
      </div>

      <p className="text-2xs text-content-muted pb-6 text-center font-semibold">
        All notifications encrypted and preserved locally on this device.
      </p>
    </main>
  );
}
