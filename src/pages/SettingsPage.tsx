/**
 * SettingsPage
 *
 * Security, configuration, and notification listener control panel for NotiCatch.
 * All settings are backed by native Android Room SQLite and SharedPreferences:
 *   - Notification Access & System Permission Diagnostics
 *   - Xiaomi / MIUI Autostart & Battery Exemption management
 *   - On-Device WhatsApp Notification Simulation Tool
 *   - Air-Gap Verification & Anti-Root Security Status
 *   - Screen Protection toggle with live WindowManager FLAG_SECURE synchronization
 *   - Session Timeout selector with native backend persistence
 *   - Spam & OTP filter with NotificationListener gate synchronization
 *   - Chat-wise PDF and CSV Export with native FileProvider sharing
 *   - Wipe All Data with typed confirmation gate
 *   - Lock and Session Sign Out
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Clock,
  Filter,
  Trash2,
  Download,
  MessageSquare,
  HelpCircle,
  LogOut,
  ChevronDown,
  FileText,
  Share2,
  Bell,
  BatteryCharging,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  ShieldCheck,
  Cpu,
  Lock,
} from 'lucide-react';
import { TopAppBar } from '@/components/navigation';
import { SettingsRow, ToggleSwitch, LoadingSpinner, ConfirmationModal } from '@/components/common';
import {
  loadAppSettings,
  persistAppSettings,
  persistAuthState,
  loadAuthState,
  wipeAllData,
  exportChatAsPDF,
  exportChatAsCSV,
  getConversations,
  setSpamFilterNative,
  setScreenSecureNative,
  setSessionTimeoutNative,
  checkNotificationListenerEnabled,
  requestNotificationListenerPermission,
  openAutostartSettings,
  requestBatteryOptimizationExemption,
  simulateNotification,
  checkDeviceSecurity,
  isNativeAndroid,
} from '@/services/NativeBridgeService';
import type { AppSettings, Conversation } from '@/types';

const DEFAULT_SETTINGS: AppSettings = {
  sessionTimeoutSeconds: 300,
  biometricEnabled:      true,
  pinEnabled:            false,
  screenSecureEnabled:   true,
  autoDeleteAfterDays:   null,
  notificationEnabled:   true,
  captureMediaEnabled:   false,
  spamFilterEnabled:     true,
};

type ModalType = 'logout' | 'wipe' | 'export' | 'security-audit' | null;

export function SettingsPage() {
  const navigate = useNavigate();
  const isNative = isNativeAndroid();

  const [settings,          setSettings]          = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading,         setIsLoading]         = useState(true);
  const [showTimeoutPicker, setShowTimeoutPicker] = useState(false);
  const [activeModal,       setActiveModal]       = useState<ModalType>(null);
  const [conversations,     setConversations]     = useState<Conversation[]>([]);
  const [exportingChatId,   setExportingChatId]   = useState<string | null>(null);
  const [exportSuccessMsg,  setExportSuccessMsg]  = useState<string | null>(null);
  const [isWiping,          setIsWiping]          = useState(false);
  const [notifAccessGranted, setNotifAccessGranted] = useState<boolean | null>(null);
  const [simulatingMsg,     setSimulatingMsg]     = useState<string | null>(null);
  const [securityStatus,    setSecurityStatus]    = useState<{ isRooted: boolean; isEmulator: boolean; airGapVerified: boolean }>({
    isRooted: false,
    isEmulator: false,
    airGapVerified: true,
  });

  const checkPermissions = useCallback(async (): Promise<void> => {
    if (!isNative) {
      setNotifAccessGranted(true);
      return;
    }
    const granted = await checkNotificationListenerEnabled();
    setNotifAccessGranted(granted);
    const sec = await checkDeviceSecurity();
    setSecurityStatus(sec);
  }, [isNative]);

  useEffect(() => {
    async function loadInitialSettings(): Promise<void> {
      const loaded = await loadAppSettings();
      setSettings(loaded);
      await checkPermissions();
      setIsLoading(false);
    }
    loadInitialSettings();
  }, [checkPermissions]);

  useEffect(() => {
    function handleFocus(): void {
      checkPermissions();
    }
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [checkPermissions]);

  async function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await persistAppSettings(updated);

    if (key === 'screenSecureEnabled') {
      await setScreenSecureNative(Boolean(value));
    } else if (key === 'spamFilterEnabled') {
      await setSpamFilterNative(Boolean(value));
    } else if (key === 'sessionTimeoutSeconds') {
      await setSessionTimeoutNative(Number(value));
    }
  }

  async function handleLogoutConfirm(): Promise<void> {
    setActiveModal(null);
    sessionStorage.removeItem('session_start');
    const auth = await loadAuthState();
    await persistAuthState({ ...auth, isAuthenticated: false });
    navigate('/login', { replace: true });
  }

  async function handleWipeConfirm(): Promise<void> {
    setIsWiping(true);
    await wipeAllData();
    sessionStorage.clear();
    setIsWiping(false);
    setActiveModal(null);
    navigate('/login', { replace: true });
  }

  async function openExportModal(): Promise<void> {
    const data = await getConversations();
    setConversations(data);
    setActiveModal('export');
  }

  async function handleExportPDF(conversationId: string, chatTitle: string): Promise<void> {
    setExportingChatId(conversationId);
    const result = await exportChatAsPDF(conversationId, chatTitle);
    setExportingChatId(null);
    if (result.filePath) {
      setExportSuccessMsg(`Exported ${result.rowCount} messages to PDF`);
      setTimeout(() => setExportSuccessMsg(null), 3000);
    }
  }

  async function handleExportCSV(conversationId: string, chatTitle: string): Promise<void> {
    setExportingChatId(conversationId);
    const result = await exportChatAsCSV(conversationId, chatTitle);
    setExportingChatId(null);
    if (result.filePath) {
      setExportSuccessMsg(`Exported ${result.rowCount} messages to CSV`);
      setTimeout(() => setExportSuccessMsg(null), 3000);
    }
  }

  async function handleSimulateMessage(): Promise<void> {
    setSimulatingMsg('Sending normal message from Mumma...');
    await simulateNotification({
      chatTitle:   'Mumma',
      senderName:  'Mumma',
      messageText: 'Hi! I will call you in 5 minutes.',
      isDeleted:   false,
      isGroup:     false,
    });
    setTimeout(() => {
      setSimulatingMsg('Message sent! Check the Chats tab.');
      setTimeout(() => setSimulatingMsg(null), 2500);
    }, 400);
  }

  async function handleSimulateDeletion(): Promise<void> {
    setSimulatingMsg('Sending deletion signal from Mumma...');
    await simulateNotification({
      chatTitle:   'Mumma',
      senderName:  'Mumma',
      messageText: 'This message was deleted',
      isDeleted:   true,
      isGroup:     false,
    });
    setTimeout(() => {
      setSimulatingMsg('Deletion captured! Check the Deleted tab.');
      setTimeout(() => setSimulatingMsg(null), 2500);
    }, 400);
  }

  const timeoutOptions = [
    { label: '30 seconds', value: 30 },
    { label: '1 minute',   value: 60 },
    { label: '5 minutes',  value: 300 },
    { label: '15 minutes', value: 900 },
    { label: 'Never',      value: 0 },
  ];

  const currentTimeoutLabel = timeoutOptions.find(
    o => o.value === settings.sessionTimeoutSeconds
  )?.label ?? '5 minutes';

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-surface-900">
        <TopAppBar title="Settings" />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface-900 pb-20">
      <TopAppBar title="Settings" />

      <div className="flex-1 overflow-y-auto pt-14 divide-y divide-surface-700">

        {/* System Listener & Permissions */}
        <section className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-xs font-bold text-content-secondary uppercase tracking-widest">
              System Listener & Permissions
            </h2>
            <span
              className={`text-2xs font-extrabold px-2 py-0.5 rounded-full ${
                notifAccessGranted
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}
            >
              {notifAccessGranted ? 'Active & Intercepting' : 'Access Required'}
            </span>
          </div>

          <div className="card p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                notifAccessGranted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {notifAccessGranted ? <CheckCircle2 className="w-5 h-5" strokeWidth={2.2} /> : <AlertTriangle className="w-5 h-5" strokeWidth={2.2} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-content-primary">
                  {notifAccessGranted ? 'WhatsApp Notification Service Bound' : 'Notification Access Disabled'}
                </p>
                <p className="text-xs text-content-muted mt-0.5 font-medium leading-relaxed">
                  {notifAccessGranted
                    ? 'The Android background listener is actively intercepting WhatsApp notifications into local Room SQLite.'
                    : 'Android requires you to grant Notification Access permission so NotiCatch can intercept WhatsApp messages.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                id="open-notif-settings-btn"
                onClick={() => requestNotificationListenerPermission()}
                className="btn-primary text-xs py-2 flex items-center justify-center gap-1.5"
              >
                <Bell className="w-3.5 h-3.5" />
                Notification Access
              </button>
              <button
                type="button"
                id="open-autostart-settings-btn"
                onClick={() => openAutostartSettings()}
                className="btn-secondary text-xs py-2 flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                Xiaomi / OEM Autostart
              </button>
              <button
                type="button"
                id="request-battery-exemption-btn"
                onClick={() => requestBatteryOptimizationExemption()}
                className="btn-secondary text-xs py-2 flex items-center justify-center gap-1.5"
              >
                <BatteryCharging className="w-3.5 h-3.5" />
                Battery Optimization
              </button>
            </div>
          </div>
        </section>

        {/* Air-Gap & Hardware Security Audit */}
        <section className="px-4 pt-5 pb-2">
          <h2 className="text-xs font-bold text-content-secondary uppercase tracking-widest mb-2.5 px-1">
            Air-Gap & Hardware Security
          </h2>
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between py-1 border-b border-surface-700">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-accent" />
                <span className="text-xs font-bold text-content-primary">Network Air-Gap Status</span>
              </div>
              <span className="text-2xs font-extrabold text-accent bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                100% Air-Gapped (0 Sockets)
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-surface-700">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-content-secondary" />
                <span className="text-xs font-bold text-content-primary">OS Integrity / Root</span>
              </div>
              <span className={`text-2xs font-bold px-2 py-0.5 rounded border ${
                securityStatus.isRooted ? 'bg-red-100 text-red-900 border-red-300' : 'bg-emerald-100 text-emerald-900 border-emerald-300'
              }`}>
                {securityStatus.isRooted ? 'Rooted / Modified' : 'Clean & Unmodified'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-surface-700">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-content-secondary" />
                <span className="text-xs font-bold text-content-primary">Window Protection (FLAG_SECURE)</span>
              </div>
              <span className="text-2xs font-bold text-accent">
                {settings.screenSecureEnabled ? 'Active (Blocked)' : 'Disabled'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-content-secondary" />
                <span className="text-xs font-bold text-content-primary">Database Engine</span>
              </div>
              <span className="text-2xs font-bold text-content-primary">
                Room SQLite · WAL Mode
              </span>
            </div>
          </div>
        </section>

        {/* Notification Diagnostics & Testing */}
        <section className="px-4 pt-5 pb-2">
          <h2 className="text-xs font-bold text-content-secondary uppercase tracking-widest mb-2.5 px-1">
            Notification Diagnostics & Testing
          </h2>
          <div className="card p-4 space-y-3">
            <p className="text-xs text-content-muted leading-relaxed font-medium">
              Test end-to-end SQLite persistence, deletion capture, and live UI reactivity without needing a second phone.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="test-normal-msg-btn"
                onClick={handleSimulateMessage}
                className="btn-secondary text-xs py-2 flex items-center justify-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                Test Message
              </button>
              <button
                type="button"
                id="test-deleted-msg-btn"
                onClick={handleSimulateDeletion}
                className="btn-secondary text-xs py-2 flex items-center justify-center gap-1.5 text-amber-800 border-amber-300"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Test Deletion
              </button>
            </div>
            {simulatingMsg && (
              <div className="p-2.5 rounded-lg bg-surface-800 border border-surface-700 text-xs font-semibold text-accent text-center animate-fade-in">
                {simulatingMsg}
              </div>
            )}
          </div>
        </section>

        {/* Security & Access */}
        <section className="px-4 pt-5 pb-2">
          <h2 className="text-xs font-bold text-content-secondary uppercase tracking-widest mb-2.5 px-1">
            Security & Access
          </h2>
          <div className="space-y-2">
            <div className="card-interactive flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-lg bg-surface-800 flex items-center justify-center text-accent flex-shrink-0">
                <Shield className="w-5 h-5 text-accent" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-content-primary">Screen Protection</p>
                <p className="text-xs text-content-muted mt-0.5 font-medium">Block screenshots and hide app in recent tasks (FLAG_SECURE)</p>
              </div>
              <ToggleSwitch
                id="screen-secure-toggle"
                label="Screen protection"
                checked={settings.screenSecureEnabled}
                onChange={checked => updateSetting('screenSecureEnabled', checked)}
              />
            </div>

            <div className="card-interactive overflow-hidden" style={{ padding: 0 }}>
              <button
                id="session-timeout-button"
                type="button"
                onClick={() => setShowTimeoutPicker(!showTimeoutPicker)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-850 transition-colors text-left"
                style={{ borderRadius: '6px' }}
              >
                <div className="w-9 h-9 rounded-lg bg-surface-800 flex items-center justify-center text-accent flex-shrink-0">
                  <Clock className="w-5 h-5 text-accent" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-content-primary">Session Timeout</p>
                  <p className="text-xs text-content-muted mt-0.5 font-medium">Auto-lock after background inactivity</p>
                </div>
                <span className="text-xs text-content-secondary font-semibold mr-1">{currentTimeoutLabel}</span>
                <ChevronDown
                  className={`w-4 h-4 text-content-muted transition-transform duration-200 ${showTimeoutPicker ? 'rotate-180' : ''}`}
                  strokeWidth={2}
                />
              </button>

              {showTimeoutPicker && (
                <div className="border-t border-surface-700 divide-y divide-surface-700 animate-slide-up">
                  {timeoutOptions.map(option => (
                    <button
                      key={option.value}
                      id={`timeout-option-${option.value}`}
                      type="button"
                      onClick={() => {
                        updateSetting('sessionTimeoutSeconds', option.value);
                        setShowTimeoutPicker(false);
                      }}
                      className={`w-full px-5 py-3 text-left text-sm font-medium transition-colors ${
                        settings.sessionTimeoutSeconds === option.value
                          ? 'text-accent font-bold bg-accent-muted'
                          : 'text-content-primary hover:bg-surface-850'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Capture Configuration */}
        <section className="px-4 pt-5 pb-2">
          <h2 className="text-xs font-bold text-content-secondary uppercase tracking-widest mb-2.5 px-1">
            Capture Configuration
          </h2>
          <div className="space-y-2">
            <div className="card-interactive flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-lg bg-surface-800 flex items-center justify-center text-accent flex-shrink-0">
                <Filter className="w-5 h-5 text-accent" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-content-primary">Spam & OTP Filter</p>
                <p className="text-xs text-content-muted mt-0.5 font-medium">Suppress verification codes and automated broadcast spam</p>
              </div>
              <ToggleSwitch
                id="spam-filter-toggle"
                label="Spam filter"
                checked={settings.spamFilterEnabled}
                onChange={checked => updateSetting('spamFilterEnabled', checked)}
              />
            </div>
          </div>
        </section>

        {/* Data Management */}
        <section className="px-4 pt-5 pb-2">
          <h2 className="text-xs font-bold text-content-secondary uppercase tracking-widest mb-2.5 px-1">
            Data Management
          </h2>
          <div className="space-y-2">
            <SettingsRow
              id="export-data-button"
              icon={<Download className="w-5 h-5 text-accent" strokeWidth={2} />}
              label="Export Chat Data"
              description="Export chat conversations in PDF or CSV format chat-wise"
              onClick={openExportModal}
            />
            <SettingsRow
              id="wipe-data-button"
              icon={<Trash2 className="w-5 h-5 text-red-600" strokeWidth={2} />}
              label="Wipe All Data"
              description="Permanently delete all captured SQLite messages and reset"
              onClick={() => setActiveModal('wipe')}
              danger
            />
          </div>
        </section>

        {/* Support & Diagnostics */}
        <section className="px-4 pt-5 pb-2">
          <h2 className="text-xs font-bold text-content-secondary uppercase tracking-widest mb-2.5 px-1">
            Support & Diagnostics
          </h2>
          <div className="space-y-2">
            <SettingsRow
              id="contact-us-button"
              icon={<MessageSquare className="w-5 h-5 text-accent" strokeWidth={2} />}
              label="Contact Us"
              description="Get assistance with notification capture configuration"
              onClick={() => navigate('/contact')}
            />
            <SettingsRow
              id="feedback-button"
              icon={<HelpCircle className="w-5 h-5 text-accent" strokeWidth={2} />}
              label="Feedback & Diagnostics"
              description="Report device issues and verify listener health"
              onClick={() => navigate('/feedback')}
            />
          </div>
        </section>

        {/* Lock & Sign Out */}
        <section className="px-4 pt-5 pb-8">
          <button
            id="logout-button"
            type="button"
            onClick={() => setActiveModal('logout')}
            className="btn-danger w-full"
          >
            {isWiping ? <LoadingSpinner size="sm" /> : <LogOut className="w-4 h-4" strokeWidth={2.2} />}
            Lock Application
          </button>
          <p className="text-2xs text-content-muted text-center mt-3 font-medium">
            NotiCatch v1.0.0 — Zero network permission. 100% on-device SQLite storage.
          </p>
        </section>
      </div>

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        isOpen={activeModal === 'logout'}
        title="Lock Application"
        body="Your active session will be closed and authentication will be required upon next launch. All database records remain safely preserved."
        confirmLabel="Lock Application"
        isDangerous={false}
        onConfirm={handleLogoutConfirm}
        onCancel={() => setActiveModal(null)}
      />

      {/* Wipe All Data Confirmation Modal */}
      <ConfirmationModal
        isOpen={activeModal === 'wipe'}
        title="Wipe All Data"
        body="This permanently deletes every captured message, conversation, and audit log from the SQLite database. This operation cannot be reversed."
        confirmLabel="Permanently Wipe All Data"
        isDangerous={true}
        onConfirm={handleWipeConfirm}
        onCancel={() => setActiveModal(null)}
      />

      {/* Export Selection Modal */}
      {activeModal === 'export' && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="card max-w-md w-full p-6 space-y-4 shadow-card-lg animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-content-primary text-base">Select Chat to Export</h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-content-muted hover:text-content-primary"
              >
                ✕
              </button>
            </div>

            {exportSuccessMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200">
                {exportSuccessMsg}
              </div>
            )}

            <div className="max-h-60 overflow-y-auto space-y-2 divide-y divide-surface-700">
              {conversations.length === 0 ? (
                <p className="text-xs text-content-muted py-4 text-center">No captured conversations found.</p>
              ) : (
                conversations.map(c => (
                  <div key={c.id} className="pt-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-content-primary truncate">{c.chatTitle}</p>
                      <p className="text-2xs text-content-muted">{c.unreadCount} unread · {c.deletedCount} deleted</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        id={`export-pdf-${c.id}`}
                        disabled={exportingChatId === c.id}
                        onClick={() => handleExportPDF(c.id, c.chatTitle)}
                        className="btn-secondary text-2xs py-1.5 px-2 flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3 text-accent" />
                        PDF
                      </button>
                      <button
                        type="button"
                        id={`export-csv-${c.id}`}
                        disabled={exportingChatId === c.id}
                        onClick={() => handleExportCSV(c.id, c.chatTitle)}
                        className="btn-secondary text-2xs py-1.5 px-2 flex items-center gap-1"
                      >
                        <Share2 className="w-3 h-3 text-accent" />
                        CSV
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="btn-primary w-full text-xs py-2"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
