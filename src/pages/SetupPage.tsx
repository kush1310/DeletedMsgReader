/**
 * SetupPage
 *
 * Permission onboarding wizard for NotiCatch.
 * Styled with Material 3 semantic tokens, standalone theme support, and haptics.
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
import { HapticService } from '@/services/HapticService';

export function SetupPage() {
  const navigate = useNavigate();
  const native   = isNativeAndroid();

  const [notifGranted,     setNotifGranted]     = useState(false);
  const [batteryGranted,   setBatteryGranted]   = useState(false);
  const [isChecking,       setIsChecking]       = useState(true);
  const [autoLaunched,     setAutoLaunched]     = useState(false);
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
        HapticService.success();
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
    HapticService.selection();
    await requestNotificationListenerPermission();
    setAutoLaunched(true);
  }

  function handleContinue(): void {
    if (notifGranted) {
      HapticService.navigate();
      navigate('/chats', { replace: true });
    }
  }

  if (isChecking) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--md-sys-color-background)' }}
      >
        <LoadingSpinner size="lg" />
      </main>
    );
  }

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{
        background: 'var(--md-sys-color-background)',
        color: 'var(--md-sys-color-on-surface)',
      }}
    >
      <div className="px-6 pt-safe pb-8 flex flex-col gap-6 flex-1 max-w-lg mx-auto w-full">

        {/* Brand header */}
        <div className="pt-6 flex flex-col items-center gap-2 animate-fade-in text-center">
          <div
            className="w-20 h-20 rounded-2xl border shadow-xs flex items-center justify-center relative overflow-hidden mb-1"
            style={{
              background: 'var(--md-sys-color-surface)',
              borderColor: 'var(--md-sys-color-outline-variant)',
            }}
          >
            <ThreeSecurityCanvas size={80} active={!notifGranted} />
          </div>
          <AppBrand />
          <p
            className="text-xs font-medium max-w-[280px]"
            style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
          >
            Grant system permissions to enable instant WhatsApp notification capture.
          </p>
        </div>

        {/* Permission steps */}
        <div className="space-y-3 animate-slide-up">

          {/* Notification Access */}
          <div
            className="p-4 rounded-2xl border shadow-xs flex gap-3.5"
            style={{
              background: 'var(--md-sys-color-surface)',
              borderColor: 'var(--md-sys-color-outline-variant)',
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border"
              style={{
                background: notifGranted
                  ? 'var(--md-sys-color-success-container)'
                  : 'var(--md-sys-color-primary-container)',
                borderColor: notifGranted
                  ? 'var(--md-sys-color-success-border)'
                  : 'var(--md-sys-color-outline-variant)',
                color: notifGranted
                  ? 'var(--md-sys-color-success)'
                  : 'var(--md-sys-color-primary)',
              }}
            >
              <Bell className="w-5 h-5" strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs sm:text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>
                  Notification Access
                </p>
                <span
                  className="text-2xs px-2 py-0.5 rounded-full font-bold border"
                  style={{
                    background: 'var(--md-sys-color-primary-container)',
                    color: 'var(--md-sys-color-on-primary-container)',
                    borderColor: 'var(--md-sys-color-outline-variant)',
                  }}
                >
                  Required
                </span>
              </div>
              <p className="text-xs leading-relaxed mb-3 font-medium" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
                Intercepts incoming WhatsApp notifications to preserve messages before deletion.
              </p>

              {notifGranted ? (
                <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--md-sys-color-success)' }}>
                  <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
                  <span>Permission Active</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {native && autoLaunched && (
                    <p className="text-xs font-medium" style={{ color: 'var(--md-sys-color-warning)' }}>
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
          <div
            className="p-4 rounded-2xl border shadow-xs flex gap-3.5"
            style={{
              background: 'var(--md-sys-color-surface)',
              borderColor: 'var(--md-sys-color-outline-variant)',
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border"
              style={{
                background: batteryGranted
                  ? 'var(--md-sys-color-success-container)'
                  : 'var(--md-sys-color-surface-container)',
                borderColor: batteryGranted
                  ? 'var(--md-sys-color-success-border)'
                  : 'var(--md-sys-color-outline-variant)',
                color: batteryGranted
                  ? 'var(--md-sys-color-success)'
                  : 'var(--md-sys-color-on-surface-variant)',
              }}
            >
              <BatteryCharging className="w-5 h-5" strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs sm:text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>
                  Battery Saver Exemption
                </p>
                <span
                  className="text-2xs px-2 py-0.5 rounded-full font-medium border"
                  style={{
                    background: 'var(--md-sys-color-surface-container)',
                    color: 'var(--md-sys-color-on-surface-variant)',
                    borderColor: 'var(--md-sys-color-outline-variant)',
                  }}
                >
                  Recommended
                </span>
              </div>
              <p className="text-xs leading-relaxed font-medium" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
                Prevents Android battery optimization from sleeping the background listener.
              </p>
              {batteryGranted && (
                <div className="flex items-center gap-1.5 text-xs font-bold mt-2" style={{ color: 'var(--md-sys-color-success)' }}>
                  <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
                  <span>Exemption Active</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Waiting indicator */}
        {!notifGranted && native && (
          <div
            className="flex items-center gap-3 p-4 rounded-2xl border shadow-xs animate-fade-in"
            style={{
              background: 'var(--md-sys-color-warning-container)',
              borderColor: 'var(--md-sys-color-warning-border)',
            }}
          >
            <ShieldAlert className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--md-sys-color-warning)' }} strokeWidth={2.2} />
            <div>
              <p className="text-xs leading-relaxed font-medium" style={{ color: 'var(--md-sys-color-on-warning-container)' }}>
                Waiting for notification access — enable <strong>NotiCatch</strong> in the system list, then return here.
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <LoadingSpinner size="sm" />
                <span className="text-2xs font-medium" style={{ color: 'var(--md-sys-color-on-warning-container)' }}>
                  Checking every 1.5 seconds...
                </span>
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
          className="btn-primary w-full text-sm font-bold flex items-center justify-center gap-2 min-h-[48px]"
        >
          <span>Continue to NotiCatch</span>
          <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
        </button>

        <p className="text-2xs text-center font-medium" style={{ color: 'var(--md-sys-color-on-surface-muted)' }}>
          Zero internet permissions. All data stored on-device only.
        </p>
      </div>
    </main>
  );
}
