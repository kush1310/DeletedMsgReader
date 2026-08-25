/**
 * PermissionsSettingsPage
 *
 * System permissions hub for NotiCatch.
 * Styled with Material 3 semantic tokens and direct native triggers for all 4 permissions:
 * 1. Notification Listener Access (Direct Android Settings)
 * 2. Battery Saver Optimization Exemption (Direct Android Battery Request)
 * 3. Screen Capture Protection (FLAG_SECURE)
 * 4. OEM Autostart & App System Settings
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  BatteryCharging,
  ShieldAlert,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Sliders,
} from 'lucide-react';
import { TopAppBar, IconButton } from '@/components/navigation';
import { ToggleSwitch } from '@/components/common';
import {
  checkNotificationListenerEnabled,
  requestNotificationListenerPermission,
  requestBatteryExemptionNative,
  setScreenSecureNative,
  openAutostartSettings,
  loadAppSettings,
  saveAppSettings,
} from '@/services/NativeBridgeService';
import { HapticService } from '@/services/HapticService';

export function PermissionsSettingsPage() {
  const navigate = useNavigate();

  const [notifListenerOn, setNotifListenerOn] = useState<boolean | null>(null);
  const [screenSecureOn,  setScreenSecureOn]  = useState(true);

  useEffect(() => {
    checkNotificationListenerEnabled().then(setNotifListenerOn);
    loadAppSettings().then(settings => {
      if (settings) {
        setScreenSecureOn(settings.screenSecureEnabled);
      }
    });
  }, []);

  async function handleToggleScreenSecure(enabled: boolean): Promise<void> {
    setScreenSecureOn(enabled);
    await setScreenSecureNative(enabled);
    const settings = await loadAppSettings();
    if (settings) {
      await saveAppSettings({ ...settings, screenSecureEnabled: enabled });
    }
  }

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{
        background: 'var(--md-sys-color-background)',
        color: 'var(--md-sys-color-on-surface)',
      }}
    >
      <TopAppBar
        title="Permissions"
        subtitle="System Access & Background Control"
        leading={
          <IconButton
            id="permissions-back-button"
            icon={<ArrowLeft className="w-5 h-5" style={{ color: 'var(--md-sys-color-on-surface)' }} />}
            label="Back to settings"
            onClick={() => {
              HapticService.navigate();
              navigate(-1);
            }}
          />
        }
      />

      <main className="flex-1 pt-16 pb-12 px-4 max-w-lg mx-auto w-full space-y-4 animate-slide-up">

        {/* Overview Banner */}
        <div
          className="p-4 rounded-2xl border space-y-1"
          style={{
            background: 'var(--md-sys-color-surface-container)',
            borderColor: 'var(--md-sys-color-outline-variant)',
          }}
        >
          <h2
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: 'var(--md-sys-color-on-surface)' }}
          >
            Required Android Permissions
          </h2>
          <p
            className="text-xs leading-relaxed"
            style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
          >
            NotiCatch requires system notification listener and battery saver exemptions to capture deleted messages reliably in the background without internet access.
          </p>
        </div>

        {/* Permission Cards Group */}
        <div
          className="rounded-2xl border divide-y overflow-hidden shadow-xs"
          style={{
            background: 'var(--md-sys-color-surface)',
            borderColor: 'var(--md-sys-color-outline-variant)',
            boxShadow: 'var(--md-elevation-1)',
          }}
        >

          {/* 1. Notification Listener Access */}
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'var(--md-sys-color-primary-container)',
                    color: 'var(--md-sys-color-on-primary-container)',
                    border: '1px solid var(--md-sys-color-outline-variant)',
                  }}
                >
                  <Bell className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>
                      Notification Access
                    </h3>
                    {notifListenerOn === true ? (
                      <span className="badge-success text-2xs">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="badge-deleted text-2xs">
                        <AlertTriangle className="w-3 h-3" /> Disabled
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
                    Grants Android NotificationListenerService permission to intercept WhatsApp messages locally.
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              id="btn-grant-notification-access"
              onClick={() => {
                HapticService.selection();
                requestNotificationListenerPermission();
              }}
              className="btn-primary w-full text-xs font-bold flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <span>Open Notification Access Settings</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 2. Battery Saver Optimization Exemption */}
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'var(--md-sys-color-tertiary-container)',
                    color: 'var(--md-sys-color-on-tertiary-container)',
                    border: '1px solid var(--md-sys-color-tertiary-border)',
                  }}
                >
                  <BatteryCharging className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>
                    Battery Saver Exemption
                  </h3>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
                    Prevents Android doze mode from putting the background listener service to sleep.
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              id="btn-grant-battery-exemption"
              onClick={() => {
                HapticService.selection();
                requestBatteryExemptionNative();
              }}
              className="btn-secondary w-full text-xs font-bold flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <span>Request Battery Optimization Exemption</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 3. Screen Capture Protection (FLAG_SECURE) */}
          <div className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'var(--md-sys-color-surface-container)',
                  color: 'var(--md-sys-color-primary)',
                  border: '1px solid var(--md-sys-color-outline-variant)',
                }}
              >
                <ShieldAlert className="w-4 h-4" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>
                  Screen Capture Protection
                </h3>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
                  Applies FLAG_SECURE to block screenshots, screen recording, and app switcher preview.
                </p>
              </div>
            </div>
            <ToggleSwitch
              id="toggle-screen-secure-perm"
              checked={screenSecureOn}
              onChange={handleToggleScreenSecure}
              label="Screen Capture Protection"
            />
          </div>

          {/* 4. OEM Autostart & App Settings */}
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'var(--md-sys-color-success-container)',
                    color: 'var(--md-sys-color-on-success-container)',
                    border: '1px solid var(--md-sys-color-success-border)',
                  }}
                >
                  <Sliders className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>
                    OEM Autostart & System Settings
                  </h3>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
                    Configure background autostart on Xiaomi, Oppo, Vivo, Samsung, and OnePlus devices.
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              id="btn-open-autostart-settings"
              onClick={() => {
                HapticService.selection();
                openAutostartSettings();
              }}
              className="btn-secondary w-full text-xs font-bold flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <span>Open Autostart & App Details</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 5. Air-Gap Cryptographic Isolation Proof */}
          <div className="p-4 space-y-2">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'var(--md-sys-color-success-container)',
                  color: 'var(--md-sys-color-on-success-container)',
                  border: '1px solid var(--md-sys-color-success-border)',
                }}
              >
                <CheckCircle2 className="w-4 h-4" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>
                  Air-Gap Verification Status
                </h3>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
                  100% Offline · Zero Internet Permission (android.permission.INTERNET is omitted) · Local Room SQLite.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
