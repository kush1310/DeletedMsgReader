/**
 * PermissionsSettingsPage
 *
 * System permissions hub for NotiCatch.
 * Styled in clean Signal aesthetic with crisp white card surfaces and direct native triggers.
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
} from '@/services/NativeBridgeService';

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
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#111827]">
      <TopAppBar
        title="Permissions"
        subtitle="System Access & Background Control"
        leading={
          <IconButton
            id="permissions-back-button"
            icon={<ArrowLeft className="w-5 h-5 text-[#111827]" />}
            label="Back to settings"
            onClick={() => navigate(-1)}
          />
        }
      />

      <main className="flex-1 pt-16 pb-12 px-4 max-w-lg mx-auto w-full space-y-4 animate-slide-up">

        {/* Overview Banner */}
        <div className="p-4 rounded-2xl border border-[#E5E7EB] space-y-1" style={{ background: '#F8F9FA' }}>
          <h2 className="text-xs font-bold text-[#111827] uppercase tracking-wider">
            Required Android Permissions
          </h2>
          <p className="text-xs text-[#6B7280] leading-relaxed">
            NotiCatch requires system notification listener and battery saver exemptions to capture deleted messages reliably in the background without internet access.
          </p>
        </div>

        {/* Permission Cards Group */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white divide-y divide-[#F2F2F7] shadow-xs overflow-hidden">

          {/* 1. Notification Listener Access */}
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[#2C6BED] shrink-0 border border-[#DBEAFE]" style={{ background: '#EEF2FF' }}>
                  <Bell className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#111827]">Notification Access</h3>
                    {notifListenerOn === true ? (
                      <span className="flex items-center gap-1 text-[0.65rem] font-bold text-emerald-600 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[0.65rem] font-bold text-amber-600 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200">
                        <AlertTriangle className="w-3 h-3" /> Disabled
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#6B7280] mt-0.5 leading-relaxed">
                    Grants Android NotificationListenerService permission to intercept WhatsApp messages locally.
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              id="btn-grant-notification-access"
              onClick={requestNotificationListenerPermission}
              className="w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-[#DBEAFE] text-[#2C6BED]"
              style={{ background: '#EEF2FF' }}
            >
              <span>Open Notification Access Settings</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 2. Battery Saver Optimization Exemption */}
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[#D97706] shrink-0 border border-amber-200" style={{ background: '#FFF4E5' }}>
                  <BatteryCharging className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#111827]">Battery Saver Exemption</h3>
                  <p className="text-xs text-[#6B7280] mt-0.5 leading-relaxed">
                    Prevents Android doze mode from putting the background listener service to sleep.
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              id="btn-grant-battery-exemption"
              onClick={requestBatteryExemptionNative}
              className="w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-[#E5E7EB] bg-[#F8F9FA] text-[#111827]"
            >
              <span>Request Battery Optimization Exemption</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 3. Screen Capture Protection (FLAG_SECURE) */}
          <div className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[#7C3AED] shrink-0 border border-purple-200" style={{ background: '#F5F3FF' }}>
                <ShieldAlert className="w-4 h-4" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[#111827]">Screen Capture Protection</h3>
                <p className="text-xs text-[#6B7280] mt-0.5 leading-relaxed">
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
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[#059669] shrink-0 border border-emerald-200" style={{ background: '#ECFDF5' }}>
                  <Sliders className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#111827]">OEM Autostart & System Settings</h3>
                  <p className="text-xs text-[#6B7280] mt-0.5 leading-relaxed">
                    Configure background autostart on Xiaomi, Oppo, Vivo, Samsung, and OnePlus devices.
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              id="btn-open-autostart-settings"
              onClick={openAutostartSettings}
              className="w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-[#E5E7EB] bg-[#F8F9FA] text-[#111827]"
            >
              <span>Open Autostart & App Details</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
