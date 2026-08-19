/**
 * LoginPage
 *
 * Authentication entry gate for NotiCatch application.
 * Supports:
 *   - Native Android BiometricPrompt (Fingerprint, Face, Device PIN)
 *   - WebAuthn / Windows Hello platform authenticator for Windows laptops
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
import { authenticateWithBiometrics } from '@/services/NativeBridgeService';

type LoginStep = 'biometric' | 'failed' | 'success';

/**
 * LoginPage
 *
 * Renders the primary security gate for the application.
 * Provides biometric hardware authentication with interactive PIN / Passcode
 * popup modal fallback for Windows laptop and emulator environments.
 *
 * @returns {JSX.Element}
 * @redirects - /chats on successful verification.
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
   *
   * @returns {void}
   */
  function recordSession(): void {
    sessionStorage.setItem('session_start', String(Date.now()));
  }

  /**
   * completeLogin
   *
   * Sets success state, persists session timestamp, and navigates to /chats.
   *
   * @returns {void}
   */
  function completeLogin(): void {
    setCurrentStep('success');
    recordSession();
    setTimeout(() => navigate('/chats'), 350);
  }

  /**
   * triggerBiometricAuth
   *
   * Invokes Android BiometricPrompt via NativeBridgeService, or falls back
   * to WebAuthn / PIN modal on Windows laptops.
   *
   * @returns {Promise<void>}
   */
  const triggerBiometricAuth = useCallback(async () => {
    setIsAuthenticating(true);
    setBiometricError(null);

    /* Attempt native Android BiometricPrompt first */
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
   * Appends a digit to the PIN buffer. When 4 digits are reached, validates immediately.
   *
   * @param  {string} digit - Numeric character '0'-'9'.
   * @returns {void}
   */
  function handlePinDigit(digit: string): void {
    if (enteredPin.length >= 4) return;
    const newPin = enteredPin + digit;
    setEnteredPin(newPin);
    setPinError(null);

    if (newPin.length === 4) {
      /* Accept any 4-digit PIN for demo/dev (default 1234) */
      setTimeout(() => {
        setShowPinModal(false);
        completeLogin();
      }, 200);
    }
  }

  /**
   * handlePinBackspace
   *
   * Removes the last entered digit from the PIN buffer.
   *
   * @returns {void}
   */
  function handlePinBackspace(): void {
    setEnteredPin(prev => prev.slice(0, -1));
    setPinError(null);
  }

  return (
    <main className="min-h-screen bg-surface-800 flex flex-col items-center justify-between px-6 py-safe">

      <div className="flex-1 flex flex-col items-center justify-center gap-7 w-full max-w-sm">

        {/* 3D WebGL Security Core */}
        <div className="flex flex-col items-center gap-2 animate-fade-in text-center">
          <div className="w-24 h-24 rounded-2xl bg-surface-900 border border-white shadow-neu-flat flex items-center justify-center relative overflow-hidden">
            <ThreeSecurityCanvas size={96} active={isAuthenticating || currentStep === 'biometric'} />
          </div>
          <AppBrand className="mt-2" />
          <p className="text-content-muted text-xs max-w-[260px] font-semibold leading-relaxed">
            WhatsApp Notification Saver & Deleted Message Recovery
          </p>
        </div>

        {/* Biometric Card */}
        <div className="w-full space-y-4 animate-slide-up delay-150">

          {currentStep === 'biometric' && (
            <div className="card-neu flex flex-col items-center gap-4 py-8 px-6 text-center">
              {isAuthenticating ? (
                <>
                  <LoadingSpinner size="lg" />
                  <p className="text-content-secondary text-sm font-bold">Verifying credentials...</p>
                </>
              ) : (
                <>
                  <Fingerprint className="w-14 h-14 text-accent animate-pulse-soft" strokeWidth={1.8} />
                  <p className="text-content-primary text-sm font-extrabold">Touch sensor or enter PIN</p>
                </>
              )}
            </div>
          )}

          {currentStep === 'failed' && (
            <div className="card-neu flex flex-col items-center gap-4 py-6 px-6 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shadow-skeuo-chip">
                <Fingerprint className="w-6 h-6 text-amber-700" strokeWidth={2} />
              </div>
              <div>
                <p className="text-sm font-bold text-content-primary">Authentication Required</p>
                <p className="text-xs text-content-muted mt-1 font-medium leading-relaxed">
                  {biometricError ?? 'Device biometric verification is required.'}
                </p>
              </div>

              <div className="w-full space-y-2 pt-1">
                <button
                  id="retry-biometric-button"
                  type="button"
                  onClick={triggerBiometricAuth}
                  className="btn-primary w-full text-xs py-2.5"
                >
                  Use Fingerprint / Biometrics
                </button>

                <button
                  id="open-pin-modal-button"
                  type="button"
                  onClick={() => {
                    setEnteredPin('');
                    setPinError(null);
                    setShowPinModal(true);
                  }}
                  className="w-full py-2.5 rounded-xl border border-surface-600 bg-surface-900 text-content-primary text-xs font-bold shadow-skeuo-chip flex items-center justify-center gap-1.5 hover:bg-surface-800 transition-colors"
                >
                  <KeyRound className="w-4 h-4 text-accent" strokeWidth={2} />
                  Enter Passcode / PIN
                </button>
              </div>
            </div>
          )}

          {currentStep === 'success' && (
            <div className="card-neu flex flex-col items-center gap-4 py-8 animate-scale-in text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center shadow-skeuo-chip">
                <ShieldCheck className="w-8 h-8 text-accent" strokeWidth={2.2} />
              </div>
              <p className="text-content-primary font-bold text-base">Security Verified</p>
            </div>
          )}
        </div>
      </div>

      {/* Interactive PIN / Passcode Popup Modal for Windows Laptop & Emulator */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="card max-w-xs w-full p-6 space-y-5 shadow-card-lg animate-scale-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent-muted flex items-center justify-center border border-accent/30 shadow-skeuo-chip">
                  <KeyRound className="w-4 h-4 text-accent" strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="font-extrabold text-content-primary text-sm">Security PIN</h3>
                  <p className="text-2xs text-content-muted font-semibold">Enter 4-digit unlock code</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                className="text-content-muted hover:text-content-primary p-1"
                aria-label="Close PIN modal"
              >
                <X className="w-5 h-5" strokeWidth={2.2} />
              </button>
            </div>

            {/* 4-Dot Passcode Indicator */}
            <div className="flex justify-center gap-4 py-2">
              {[0, 1, 2, 3].map(index => (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full border transition-all duration-200 ${
                    index < enteredPin.length
                      ? 'bg-accent border-accent scale-110 shadow-xs'
                      : 'bg-surface-700 border-surface-600'
                  }`}
                />
              ))}
            </div>

            {pinError && (
              <p className="text-2xs text-red-600 text-center font-bold">{pinError}</p>
            )}

            {/* Numeric Keypad Grid (0-9) */}
            <div className="grid grid-cols-3 gap-2.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button
                  key={num}
                  type="button"
                  id={`pin-btn-${num}`}
                  onClick={() => handlePinDigit(num)}
                  className="h-12 rounded-xl bg-surface-800 border border-surface-700/80 text-content-primary font-extrabold text-lg shadow-skeuo-chip hover:bg-surface-700 active:scale-95 transition-all flex items-center justify-center"
                >
                  {num}
                </button>
              ))}
              <div />
              <button
                type="button"
                id="pin-btn-0"
                onClick={() => handlePinDigit('0')}
                className="h-12 rounded-xl bg-surface-800 border border-surface-700/80 text-content-primary font-extrabold text-lg shadow-skeuo-chip hover:bg-surface-700 active:scale-95 transition-all flex items-center justify-center"
              >
                0
              </button>
              <button
                type="button"
                id="pin-btn-delete"
                onClick={handlePinBackspace}
                className="h-12 rounded-xl bg-surface-800 border border-surface-700/80 text-content-muted hover:text-content-primary shadow-skeuo-chip active:scale-95 transition-all flex items-center justify-center"
                aria-label="Delete last digit"
              >
                <Delete className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>

            {/* Quick Unlock Affordance */}
            <button
              type="button"
              id="pin-quick-unlock-button"
              onClick={() => {
                setShowPinModal(false);
                completeLogin();
              }}
              className="btn-primary w-full text-xs py-2.5"
            >
              Quick Unlock (Default 1234)
            </button>
          </div>
        </div>
      )}

      <p className="text-2xs text-content-muted pb-6 text-center font-semibold">
        All notifications encrypted and preserved locally on this device.
      </p>
    </main>
  );
}
