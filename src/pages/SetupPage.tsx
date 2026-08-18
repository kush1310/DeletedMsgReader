/**
 * SetupPage
 *
 * Permission onboarding wizard that guides the user through granting
 * all required Android permissions for NotiCatch to function:
 *   1. Notification Listener access (mandatory — core functionality)
 *   2. Battery optimization exemption (recommended — prevents Doze killing)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BatteryCharging, CheckCircle2, Circle, ChevronRight, ShieldAlert } from 'lucide-react';
import { AppBrand } from '@/components/navigation';
import { LoadingSpinner, ThreeSecurityCanvas } from '@/components/common';
import {
  checkNotificationListenerEnabled,
  requestNotificationListenerPermission,
  requestBatteryOptimizationExemption,
} from '@/services/NativeBridgeService';

interface PermissionStep {
  readonly id:          string;
  readonly icon:        React.ReactNode;
  readonly title:       string;
  readonly description: string;
  readonly mandatory:   boolean;
  readonly granted:     boolean;
}

/**
 * SetupPage
 *
 * Renders the permission setup wizard for NotiCatch in Neumorphic Light Mode.
 */
export function SetupPage() {
  const navigate = useNavigate();

  const [notifGranted,   setNotifGranted]   = useState(false);
  const [batteryGranted, setBatteryGranted] = useState(false);
  const [isChecking,     setIsChecking]     = useState(true);
  const [isRequestingNotif,   setIsRequestingNotif]   = useState(false);
  const [isRequestingBattery, setIsRequestingBattery] = useState(false);

  useEffect(() => {
    async function checkPermissions(): Promise<void> {
      const enabled = await checkNotificationListenerEnabled();
      setNotifGranted(enabled);
      setIsChecking(false);
    }
    checkPermissions();
  }, []);

  useEffect(() => {
    if (notifGranted) return;
    const intervalId = setInterval(async () => {
      const enabled = await checkNotificationListenerEnabled();
      if (enabled) {
        setNotifGranted(true);
        clearInterval(intervalId);
      }
    }, 2000);
    return () => clearInterval(intervalId);
  }, [notifGranted]);

  async function handleNotifPermissionRequest(): Promise<void> {
    setIsRequestingNotif(true);
    await requestNotificationListenerPermission();
    setIsRequestingNotif(false);
  }

  async function handleBatteryRequest(): Promise<void> {
    setIsRequestingBattery(true);
    const result = await requestBatteryOptimizationExemption();
    setBatteryGranted(result);
    setIsRequestingBattery(false);
  }

  function handleContinue(): void {
    if (notifGranted) {
      navigate('/chats');
    }
  }

  const steps: PermissionStep[] = [
    {
      id:          'notification-listener',
      icon:        <Bell        className="w-5 h-5 text-accent" strokeWidth={2.2} />,
      title:       'Notification Access',
      description: 'NotiCatch intercepts incoming WhatsApp notifications in real-time to preserve messages before they are deleted for everyone.',
      mandatory:   true,
      granted:     notifGranted,
    },
    {
      id:          'battery-optimization',
      icon:        <BatteryCharging className="w-5 h-5 text-accent" strokeWidth={2.2} />,
      title:       'Battery Optimization Exemption',
      description: 'Ensures the background listener daemon stays alive during Android Doze mode and never misses notification events.',
      mandatory:   false,
      granted:     batteryGranted,
    },
  ];

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

        {/* 3D WebGL Shield & Brand header */}
        <div className="pt-6 flex flex-col items-center gap-2 animate-fade-in text-center">
          <div className="w-20 h-20 rounded-3xl bg-surface-900 border border-white shadow-neu-flat flex items-center justify-center relative overflow-hidden mb-1">
            <ThreeSecurityCanvas size={80} active={!notifGranted} />
          </div>
          <AppBrand />
          <p className="text-content-muted text-xs font-semibold max-w-[280px]">
            Grant system permissions to enable instant WhatsApp notification capture.
          </p>
        </div>

        {/* Permission steps */}
        <div className="space-y-3.5 animate-slide-up delay-100">
          {steps.map((step, index) => (
            <div key={step.id} className="step-card shadow-neu-flat animate-slide-up" style={{ animationDelay: `${index * 80 + 100}ms` }}>
              {/* Step icon */}
              <div className={`step-icon ${step.granted ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-surface-800 text-content-secondary border-surface-700'}`}>
                {step.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-bold text-content-primary">{step.title}</p>
                  {step.mandatory && (
                    <span className="text-2xs text-accent border border-accent/30 bg-accent-muted px-2 py-0.5 rounded-full font-bold shadow-skeuo-chip">
                      Required
                    </span>
                  )}
                </div>
                <p className="text-xs text-content-muted leading-relaxed mb-3 font-medium">
                  {step.description}
                </p>

                {/* Grant button or granted indicator */}
                {step.granted ? (
                  <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-extrabold">
                    <CheckCircle2 className="w-4 h-4 text-emerald" strokeWidth={2.5} />
                    Permission Active
                  </div>
                ) : (
                  <button
                    id={`grant-${step.id}-button`}
                    type="button"
                    onClick={step.id === 'notification-listener' ? handleNotifPermissionRequest : handleBatteryRequest}
                    disabled={step.id === 'notification-listener' ? isRequestingNotif : isRequestingBattery}
                    className="btn-primary py-2 px-4 text-xs disabled:opacity-50"
                  >
                    {(step.id === 'notification-listener' ? isRequestingNotif : isRequestingBattery) ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <Circle className="w-3.5 h-3.5" strokeWidth={2.2} />
                        Grant Permission
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Notification listener pending indicator */}
        {!notifGranted && (
          <div className="card-neu flex items-center gap-3 p-4 border-amber-300 bg-gradient-to-r from-amber-50 to-amber-100/60 animate-fade-in">
            <ShieldAlert className="w-5 h-5 text-amber-700 flex-shrink-0" strokeWidth={2.2} />
            <p className="text-xs text-amber-950 leading-relaxed font-semibold">
              Notification access is required. Tap Grant Permission, then enable <strong className="font-bold">NotiCatch</strong> in the system list.
            </p>
          </div>
        )}

        <div className="flex-1" />

        {/* Continue button */}
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
          Zero internet permissions requested. All data stored strictly on this device.
        </p>
      </div>
    </main>
  );
}
