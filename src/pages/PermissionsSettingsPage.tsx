/**
 * PermissionsSettingsPage.tsx
 *
 * System permissions sub-page for NotiCatch.
 * Styled to precisely match Anthropic Claude's mobile Permissions screen.
 */

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Navigation, BatteryCharging, ExternalLink } from 'lucide-react';
import {
  requestNotificationListenerPermission,
  requestBatteryExemptionNative,
} from '@/services/NativeBridgeService';

export function PermissionsSettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF9F5] text-content-primary">
      {/* Top App Bar */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-[#FAF9F5]/90 backdrop-blur-md border-b border-[#E8E4D8] pt-safe">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            type="button"
            id="permissions-back-button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-content-primary hover:bg-surface-850 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2} />
          </button>
          <h1 className="font-serif text-lg font-bold text-content-primary tracking-tight">
            Permissions
          </h1>
          <div className="w-9" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-20 pb-12 px-5 max-w-lg mx-auto w-full animate-slide-up">
        <div className="card bg-white rounded-3xl p-4 shadow-card border border-[#E8E4D8] space-y-4">
          {/* Notification Access */}
          <div className="flex items-start justify-between gap-3 p-2">
            <div className="flex items-start gap-3.5 flex-1 min-w-0">
              <Navigation className="w-5 h-5 text-content-secondary mt-0.5 shrink-0" strokeWidth={2} />
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-content-primary">
                  Location / Notification Access
                </h3>
                <p className="text-xs text-content-muted mt-0.5 leading-relaxed font-medium">
                  To allow access to notifications, turn on the permission in your system settings.
                </p>
              </div>
            </div>
            <button
              type="button"
              id="permission-notif-launch-btn"
              onClick={requestNotificationListenerPermission}
              className="flex items-center gap-1 text-xs font-semibold text-content-secondary hover:text-content-primary shrink-0 pt-0.5"
            >
              <span>Settings</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="border-t border-surface-700" />

          {/* Battery Saver Exemption */}
          <div className="flex items-start justify-between gap-3 p-2">
            <div className="flex items-start gap-3.5 flex-1 min-w-0">
              <BatteryCharging className="w-5 h-5 text-content-secondary mt-0.5 shrink-0" strokeWidth={2} />
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-content-primary">
                  Calendar / Battery Saver Exemption
                </h3>
                <p className="text-xs text-content-muted mt-0.5 leading-relaxed font-medium">
                  To prevent background sleep, turn on the permission in your system settings.
                </p>
              </div>
            </div>
            <button
              type="button"
              id="permission-battery-launch-btn"
              onClick={requestBatteryExemptionNative}
              className="flex items-center gap-1 text-xs font-semibold text-content-secondary hover:text-content-primary shrink-0 pt-0.5"
            >
              <span>Settings</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
