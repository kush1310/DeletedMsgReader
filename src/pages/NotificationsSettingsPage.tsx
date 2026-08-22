/**
 * NotificationsSettingsPage.tsx
 *
 * Notification preferences sub-page for NotiCatch.
 * Styled with Material 3 semantic tokens, standalone theme support, and haptics.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, ClipboardList, Bell } from 'lucide-react';
import { TopAppBar, IconButton } from '@/components/navigation';
import { ToggleSwitch } from '@/components/common';
import { HapticService } from '@/services/HapticService';

export function NotificationsSettingsPage() {
  const navigate = useNavigate();

  const [chatAlerts, setChatAlerts] = useState(
    () => localStorage.getItem('notif_chat_alerts') !== 'false'
  );
  const [deletedAlerts, setDeletedAlerts] = useState(
    () => localStorage.getItem('notif_deleted_alerts') !== 'false'
  );
  const [securitySummaries, setSecuritySummaries] = useState(
    () => localStorage.getItem('notif_security_summaries') === 'true'
  );

  function handleToggleChatAlerts(val: boolean): void {
    HapticService.selection();
    setChatAlerts(val);
    localStorage.setItem('notif_chat_alerts', String(val));
  }

  function handleToggleDeletedAlerts(val: boolean): void {
    HapticService.selection();
    setDeletedAlerts(val);
    localStorage.setItem('notif_deleted_alerts', String(val));
  }

  function handleToggleSecuritySummaries(val: boolean): void {
    HapticService.selection();
    setSecuritySummaries(val);
    localStorage.setItem('notif_security_summaries', String(val));
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
        title="Notifications"
        subtitle="Alerts & Notification Behavior"
        leading={
          <IconButton
            id="notifications-back-button"
            icon={<ArrowLeft className="w-5 h-5" style={{ color: 'var(--md-sys-color-on-surface)' }} strokeWidth={2} />}
            label="Back"
            onClick={() => {
              HapticService.navigate();
              navigate(-1);
            }}
          />
        }
      />

      {/* Main Content */}
      <main className="flex-1 pt-20 pb-12 px-4 max-w-lg mx-auto w-full space-y-4 animate-slide-up">
        <div
          className="rounded-3xl p-4 shadow-xs border divide-y"
          style={{
            background: 'var(--md-sys-color-surface)',
            borderColor: 'var(--md-sys-color-outline-variant)',
          }}
        >
          {/* Incoming message alerts */}
          <div className="flex items-start justify-between gap-3 p-2">
            <div className="flex items-start gap-3.5 min-w-0">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border"
                style={{
                  background: 'var(--md-sys-color-primary-container)',
                  borderColor: 'var(--md-sys-color-outline-variant)',
                  color: 'var(--md-sys-color-primary)',
                }}
              >
                <MessageSquare className="w-4 h-4" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--md-sys-color-on-surface)' }}>
                  Message capture alerts
                </h3>
                <p className="text-xs mt-0.5 leading-relaxed font-medium" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
                  Notify in shade when WhatsApp messages are saved
                </p>
              </div>
            </div>
            <ToggleSwitch
              id="toggle-chat-alerts"
              checked={chatAlerts}
              onChange={handleToggleChatAlerts}
              label="Message capture alerts"
            />
          </div>

          {/* Deleted message recovery alert */}
          <div className="flex items-start justify-between gap-3 p-2 pt-4">
            <div className="flex items-start gap-3.5 min-w-0">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border"
                style={{
                  background: 'var(--md-sys-color-tertiary-container)',
                  borderColor: 'var(--md-sys-color-tertiary-border)',
                  color: 'var(--md-sys-color-tertiary)',
                }}
              >
                <ClipboardList className="w-4 h-4" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--md-sys-color-on-surface)' }}>
                  Deleted message notifications
                </h3>
                <p className="text-xs mt-0.5 leading-relaxed font-medium" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
                  Immediate heads-up alert when a contact deletes a message
                </p>
              </div>
            </div>
            <ToggleSwitch
              id="toggle-deleted-alerts"
              checked={deletedAlerts}
              onChange={handleToggleDeletedAlerts}
              label="Deleted message notifications"
            />
          </div>

          {/* Security status summaries */}
          <div className="flex items-start justify-between gap-3 p-2 pt-4">
            <div className="flex items-start gap-3.5 min-w-0">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border"
                style={{
                  background: 'var(--md-sys-color-surface-container)',
                  borderColor: 'var(--md-sys-color-outline-variant)',
                  color: 'var(--md-sys-color-on-surface)',
                }}
              >
                <Bell className="w-4 h-4" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--md-sys-color-on-surface)' }}>
                  Air-gap security status
                </h3>
                <p className="text-xs mt-0.5 leading-relaxed font-medium" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
                  Periodic offline integrity check confirmations
                </p>
              </div>
            </div>
            <ToggleSwitch
              id="toggle-security-summaries"
              checked={securitySummaries}
              onChange={handleToggleSecuritySummaries}
              label="Air-gap security status"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
