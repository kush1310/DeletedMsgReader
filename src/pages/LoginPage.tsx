/**
 * LoginPage
 *
 * Biometric authentication entry gate for NotiCatch Android Application.
 * Invokes Android BiometricPrompt (fingerprint / face / device credential)
 * on launch.
 *
 * Session management: records unlock timestamp in sessionStorage on success.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fingerprint, ShieldCheck } from 'lucide-react';
import { AppBrand } from '@/components/navigation';
import { LoadingSpinner, ThreeSecurityCanvas } from '@/components/common';
import { authenticateWithBiometrics } from '@/services/NativeBridgeService';

type LoginStep = 'biometric' | 'failed' | 'success';

/**
 * LoginPage
 *
 * Renders the biometric authentication gate for the NotiCatch Android app.
 * Automatically triggers the native system fingerprint / biometric dialog on launch.
 *
 * @redirects - /chats on successful authentication.
 */
export function LoginPage() {
  const navigate = useNavigate();

  const [currentStep,      setCurrentStep]      = useState<LoginStep>('biometric');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [biometricError,   setBiometricError]   = useState<string | null>(null);

  /**
   * recordSession
   *
   * Writes unlock timestamp to sessionStorage for session timeout enforcement.
   */
  function recordSession(): void {
    sessionStorage.setItem('session_start', String(Date.now()));
  }

  /**
   * triggerBiometricAuth
   *
   * Invokes Android BiometricPrompt via NativeBridgeService.
   * On success: records session timestamp and transitions to /chats.
   */
  const triggerBiometricAuth = useCallback(async () => {
    setIsAuthenticating(true);
    setBiometricError(null);

    const result = await authenticateWithBiometrics(
      'Unlock NotiCatch',
      'Touch fingerprint sensor to access saved notifications',
    );

    setIsAuthenticating(false);

    if (result.success) {
      setCurrentStep('success');
      recordSession();
      setTimeout(() => navigate('/chats'), 400);
    } else {
      setBiometricError(result.errorMessage ?? 'Biometric verification cancelled or failed.');
      setCurrentStep('failed');
    }
  }, [navigate]);

  /* Automatically prompt for fingerprint on mount */
  useEffect(() => {
    triggerBiometricAuth();
  }, [triggerBiometricAuth]);

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
                  <p className="text-content-secondary text-sm font-bold">Verifying fingerprint...</p>
                </>
              ) : (
                <>
                  <Fingerprint className="w-14 h-14 text-accent animate-pulse-soft" strokeWidth={1.8} />
                  <p className="text-content-primary text-sm font-extrabold">Touch fingerprint sensor to unlock</p>
                </>
              )}
            </div>
          )}

          {currentStep === 'failed' && (
            <div className="card-neu flex flex-col items-center gap-4 py-8 px-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
                <Fingerprint className="w-6 h-6 text-red-600" strokeWidth={2} />
              </div>
              <div>
                <p className="text-sm font-bold text-content-primary">Authentication Required</p>
                <p className="text-xs text-content-muted mt-1 font-medium">
                  {biometricError ?? 'Device biometric verification is required to open NotiCatch.'}
                </p>
              </div>
              <button
                id="retry-biometric-button"
                type="button"
                onClick={triggerBiometricAuth}
                className="btn-primary w-full text-xs py-2.5"
              >
                Use Fingerprint
              </button>
            </div>
          )}

          {currentStep === 'success' && (
            <div className="card-neu flex flex-col items-center gap-4 py-8 animate-scale-in text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center shadow-skeuo-chip">
                <ShieldCheck className="w-8 h-8 text-emerald" strokeWidth={2.2} />
              </div>
              <p className="text-content-primary font-bold text-base">Security Verified</p>
            </div>
          )}
        </div>
      </div>

      <p className="text-2xs text-content-muted pb-6 text-center font-semibold">
        All notifications encrypted and preserved locally on this device.
      </p>
    </main>
  );
}
