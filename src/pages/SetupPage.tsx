/**
 * SetupPage
 *
 * Permission onboarding wizard for NotiCatch.
 * Styled in Anthropic Claude warm editorial aesthetic.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BatteryCharging, CheckCircle2, ChevronRight, ShieldAlert } from 'lucide-react';
import { AppBrand } from '@/components/navigation';
import { LoadingSpinner, ThreeSecurityCanvas } from '@/components/common';
import {
  checkNotificationListenerEnabled,
  requestNotificationListenerPermission,
  requestBatteryExemptionNative,
  isNativeAndroid,
} from '@/services/NativeBridgeService';

export function SetupPage() {
  const navigate = useNavigate();
  const native   = isNativeAndroid();

  const [notifGranted,    setNotifGranted]    = useState(false);
  const [batteryGranted,  setBatteryGranted]  = useState(false);
  const [isChecking,      setIsChecking]      = useState(true);
  const [autoLaunched,    setAutoLaunched]    = useState(false);
  const [batteryRequested, setBatteryRequested] = useState(false);
  const hasAutoNavigated = useRef(false);

  useEffect(() => {
    async function checkInitial(): Promise<void> {
      if (native) {
        const enabled = await checkNotificationListenerEnabled();
        setNotifGranted(enabled);
        setIsChecking(false);

        if (!enabled) {
          await requestNotificationListenerPermission();
          setAutoLaunched(true);
        }
      } else {
        setIsChecking(false);
      }
    }
    checkInitial();
  }, [native]);

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

  useEffect(() => {
    if (!notifGranted || batteryRequested || !native) return;
    setBatteryRequested(true);

    requestBatteryExemptionNative().then(() => {
      setBatteryGranted(true);
    });
  }, [notifGranted, batteryRequested, native]);

  useEffect(() => {
    if (notifGranted && !hasAutoNavigated.current) {
      hasAutoNavigated.current = true;
      setTimeout(() => navigate('/chats', { replace: true }), 800);
    }
  }, [notifGranted, navigate]);

  async function handleManualNotifRequest(): Promise<void> {
    await requestNotificationListenerPermission();
    setAutoLaunched(true);
  }

  function handleContinue(): void {
    if (notifGranted) {
      navigate('/chats', { replace: true });
    }
  }

  if (isChecking) {
    return (
      <main className="min-h-screen bg-canvas flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-canvas flex flex-col">
      <div className="px-6 pt-safe pb-8 flex flex-col gap-6 flex-1 max-w-lg mx-auto w-full">

        {/* Brand header */}
        <div className="pt-6 flex flex-col items-center gap-2 animate-fade-in text-center">
          <div className="w-20 h-20 rounded-2xl bg-white border border-surface-700 shadow-card flex items-center justify-center relative overflow-hidden mb-1">
            <ThreeSecurityCanvas size={80} active={!notifGranted} />
          </div>
          <AppBrand />
          <p className="text-content-muted text-xs font-medium max-w-[280px]">
            Grant system permissions to enable instant WhatsApp notification capture.
          </p>
        </div>

        {/* Permission steps */}
        <div className="space-y-3 animate-slide-up">

          {/* Notification Access */}
          <div className="step-card shadow-card">
            <div className={`step-icon ${notifGranted ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-surface-850 text-accent border-surface-700'}`}>
              <Bell className="w-5 h-5" strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs sm:text-sm font-bold text-content-primary">Notification Access</p>
                <span className="text-2xs text-accent border border-accent/20 bg-accent-muted px-2 py-0.5 rounded-full font-bold">Required</span>
              </div>
              <p className="text-xs text-content-muted leading-relaxed mb-3 font-medium">
                Intercepts incoming WhatsApp notifications to preserve messages before deletion.
              </p>

              {notifGranted ? (
                <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
                  <span>Permission Active</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {native && autoLaunched && (
                    <p className="text-xs text-amber-800 font-medium">
                      Settings opened — enable NotiCatch in the list, then return here.
                    </p>
                  )}
                  <button
                    id="grant-notification-button"
                    type="button"
                    onClick={handleManualNotifRequest}
                    className="btn-neu-primary py-2 px-4 text-xs self-start"
                  >
                    Re-open Settings
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Battery Optimization */}
          <div className="step-card shadow-card">
            <div className={`step-icon ${batteryGranted ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-surface-850 text-content-secondary border-surface-700'}`}>
              <BatteryCharging className="w-5 h-5" strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs sm:text-sm font-bold text-content-primary">Battery Saver Exemption</p>
                <span className="text-2xs text-content-secondary border border-surface-700 px-2 py-0.5 rounded-full font-medium">Recommended</span>
              </div>
              <p className="text-xs text-content-muted leading-relaxed font-medium">
                Prevents Android battery optimization from sleeping the background listener.
              </p>
              {batteryGranted && (
                <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold mt-2">
                  <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
                  <span>Exemption Active</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Waiting indicator */}
        {!notifGranted && native && (
          <div className="card flex items-center gap-3 p-4 border-[#F3D3A6] bg-[#FDF4E7] shadow-card animate-fade-in">
            <ShieldAlert className="w-5 h-5 text-accent flex-shrink-0" strokeWidth={2.2} />
            <div>
              <p className="text-xs text-[#9C5418] leading-relaxed font-medium">
                Waiting for notification access — enable <strong>NotiCatch</strong> in the system list, then return here.
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <LoadingSpinner size="sm" />
                <span className="text-2xs text-[#9C5418] font-medium">Checking every 1.5 seconds...</span>
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
          className="btn-neu-primary w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-warm-sm"
        >
          <span>Continue to NotiCatch</span>
          <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
        </button>

        <p className="text-2xs text-content-muted text-center font-medium">
          Zero internet permissions. All data stored on-device only.
        </p>
      </div>
    </main>
  );
}
