/**
 * SetupPage
 *
 * Permission onboarding wizard that automatically launches the Android
 * notification listener settings panel on mount (native only).
 * Polls every 1.5 seconds for permission grant, then auto-proceeds.
 *
 * Flow:
 *   1. Mount → auto-launch notification settings (no user tap required).
 *   2. Poll until permission granted → auto-request battery exemption.
 *   3. Both complete → auto-navigate to /chats.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BatteryCharging, CheckCircle2, ChevronRight, ShieldAlert } from 'lucide-react';
import { AppBrand } from '@/components/navigation';
import { LoadingSpinner, ThreeSecurityCanvas } from '@/components/common';
import {
  checkNotificationListenerEnabled,
  requestNotificationListenerPermission,
  requestBatteryOptimizationExemption,
  isNativeAndroid,
} from '@/services/NativeBridgeService';

/**
 * SetupPage
 *
 * Renders the permission setup wizard. Auto-opens the system permission
 * dialog on mount for a frictionless onboarding experience.
 *
 * @redirects - /chats once notification access is confirmed.
 */
export function SetupPage() {
  const navigate = useNavigate();
  const native   = isNativeAndroid();

  const [notifGranted,    setNotifGranted]    = useState(false);
  const [batteryGranted,  setBatteryGranted]  = useState(false);
  const [isChecking,      setIsChecking]      = useState(true);
  const [autoLaunched,    setAutoLaunched]    = useState(false);
  const [batteryRequested, setBatteryRequested] = useState(false);
  const hasAutoNavigated = useRef(false);

  /* Step 1: Check initial permission state on mount */
  useEffect(() => {
    async function checkInitial(): Promise<void> {
      if (native) {
        const enabled = await checkNotificationListenerEnabled();
        setNotifGranted(enabled);
        setIsChecking(false);

        /* Auto-launch settings immediately if not yet granted */
        if (!enabled) {
          await requestNotificationListenerPermission();
          setAutoLaunched(true);
        }
      } else {
        /* Web preview: simulate not-granted state */
        setIsChecking(false);
      }
    }
    checkInitial();
  }, [native]);

  /* Step 2: Poll every 1.5s for notification permission grant */
  useEffect(() => {
    if (notifGranted || !native) return;

    const intervalId = setInterval(async () => {
      const enabled = await checkNotificationListenerEnabled();
      if (enabled) {
        setNotifGranted(true);
        clearInterval(intervalId);
      }
    }, 1500);

    return () => clearInterval(intervalId);
  }, [notifGranted, native]);

  /* Step 3: Auto-request battery exemption once notif access is granted */
  useEffect(() => {
    if (!notifGranted || batteryRequested || !native) return;
    setBatteryRequested(true);

    requestBatteryOptimizationExemption().then(granted => {
      setBatteryGranted(granted);
    });
  }, [notifGranted, batteryRequested, native]);

  /* Step 4: Auto-navigate to /chats once both permissions are handled */
  useEffect(() => {
    if (notifGranted && !hasAutoNavigated.current) {
      hasAutoNavigated.current = true;
      /* Small delay so user sees the success state before transition */
      setTimeout(() => navigate('/chats', { replace: true }), 800);
    }
  }, [notifGranted, navigate]);

  /**
   * handleManualNotifRequest
   *
   * Manual fallback handler if user dismissed the system dialog.
   * Re-opens the notification settings screen.
   */
  async function handleManualNotifRequest(): Promise<void> {
    await requestNotificationListenerPermission();
    setAutoLaunched(true);
  }

  /**
   * handleContinue
   *
   * Manual continue button — only active once notification access is confirmed.
   * Allows user to proceed manually without waiting for the auto-navigate.
   *
   * @redirects - /chats when notifGranted is true.
   */
  function handleContinue(): void {
    if (notifGranted) {
      navigate('/chats', { replace: true });
    }
  }

  if (isChecking) {
    return (
      <main className="min-h-screen bg-surface-800 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-800 flex flex-col">
      <div className="px-6 pt-safe pb-8 flex flex-col gap-6 flex-1 max-w-lg mx-auto w-full">

        {/* Brand header */}
        <div className="pt-6 flex flex-col items-center gap-2 animate-fade-in text-center">
          <div className="w-20 h-20 rounded-2xl bg-surface-900 border border-white shadow-neu-flat flex items-center justify-center relative overflow-hidden mb-1">
            <ThreeSecurityCanvas size={80} active={!notifGranted} />
          </div>
          <AppBrand />
          <p className="text-content-muted text-xs font-semibold max-w-[280px]">
            Grant system permissions to enable instant WhatsApp notification capture.
          </p>
        </div>

        {/* Permission steps */}
        <div className="space-y-3 animate-slide-up delay-100">

          {/* Notification Access */}
          <div className="step-card shadow-neu-flat">
            <div className={`step-icon ${notifGranted ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-surface-800 text-accent border-surface-700'}`}>
              <Bell className="w-5 h-5" strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-bold text-content-primary">Notification Access</p>
                <span className="text-2xs text-accent border border-accent/30 bg-accent-muted px-2 py-0.5 rounded font-bold">Required</span>
              </div>
              <p className="text-xs text-content-muted leading-relaxed mb-3 font-medium">
                Intercepts incoming WhatsApp notifications to preserve messages before deletion.
              </p>

              {notifGranted ? (
                <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-extrabold">
                  <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
                  Permission Active
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {native && autoLaunched && (
                    <p className="text-xs text-amber-700 font-semibold">
                      Settings opened — enable NotiCatch in the list, then return here.
                    </p>
                  )}
                  <button
                    id="grant-notification-button"
                    type="button"
                    onClick={handleManualNotifRequest}
                    className="btn-primary py-2 px-4 text-xs self-start"
                  >
                    Re-open Settings
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Battery Optimization */}
          <div className="step-card shadow-neu-flat">
            <div className={`step-icon ${batteryGranted ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-surface-800 text-content-secondary border-surface-700'}`}>
              <BatteryCharging className="w-5 h-5" strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-bold text-content-primary">Battery Optimization Exemption</p>
                <span className="text-2xs text-content-secondary border border-surface-600 px-2 py-0.5 rounded font-semibold">Recommended</span>
              </div>
              <p className="text-xs text-content-muted leading-relaxed font-medium">
                Prevents Android Doze mode from sleeping the background listener daemon.
              </p>
              {batteryGranted && (
                <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-extrabold mt-2">
                  <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
                  Exemption Active
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Waiting indicator */}
        {!notifGranted && native && (
          <div className="card-neu flex items-center gap-3 p-4 border-amber-300 bg-gradient-to-r from-amber-50 to-amber-100/60 animate-fade-in">
            <ShieldAlert className="w-5 h-5 text-amber-700 flex-shrink-0" strokeWidth={2.2} />
            <div>
              <p className="text-xs text-amber-950 leading-relaxed font-semibold">
                Waiting for notification access — enable <strong>NotiCatch</strong> in the system list, then return here.
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <LoadingSpinner size="sm" />
                <span className="text-2xs text-amber-700 font-medium">Checking every 1.5 seconds...</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1" />

        {/* Manual continue button */}
        <button
          id="setup-continue-button"
          type="button"
          onClick={handleContinue}
          disabled={!notifGranted}
          className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          Continue to NotiCatch
          <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
        </button>

        <p className="text-2xs text-content-muted text-center font-semibold">
          Zero internet permissions. All data stored on-device only.
        </p>
      </div>
    </main>
  );
}
