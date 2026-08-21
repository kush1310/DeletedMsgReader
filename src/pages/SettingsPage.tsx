/**
 * SettingsPage
 *
 * Dedicated configuration and privacy hub for NotiCatch.
 *
 * Visual system: Signal Android Clean Light Aesthetic
 * - White card sections with crisp hairline borders and Signal Blue accents.
 * - Auto-Lock options: 30s, 1min, 5min, 15min, Never.
 * - Direct native action triggers for Notification Listener, Battery Saver, and FLAG_SECURE.
 * - Support & Legal with comprehensive Privacy Policy and Terms of Service.
 * - Panic Wipe / Instant Erase danger zone.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Bell,
  BatteryCharging,
  EyeOff,
  Filter,
  FileText,
  Share2,
  Trash2,
  Lock,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Mail,
  Github,
  HardDrive,
  Clock,
  Fingerprint,
} from 'lucide-react';
import { TopAppBar } from '@/components/navigation';
import { ToggleSwitch, ConfirmationModal } from '@/components/common';
import { LegalDocumentModal } from '@/components/common/LegalDocumentModal';
import { PRIVACY_POLICY, TERMS_OF_SERVICE, type LegalDocument } from '@/data/legalContent';
import {
  loadAppSettings,
  saveAppSettings,
  executePanicWipe,
  exportChatAsPDFNative,
  exportChatAsCSVNative,
  checkNotificationListenerEnabled,
  requestNotificationListenerPermission,
  requestBatteryExemptionNative,
  setScreenSecureNative,
  getConversations,
  getDeletedMessages,
} from '@/services/NativeBridgeService';
import type { AppSettings } from '@/types';

const TIMEOUT_OPTIONS: Array<{ label: string; value: number }> = [
  { label: '30 seconds', value: 30 },
  { label: '1 minute',   value: 60 },
  { label: '5 minutes',  value: 300 },
  { label: '15 minutes', value: 900 },
  { label: 'Never',      value: 0 },
];

export function SettingsPage() {
  const navigate = useNavigate();

  const [settings,             setSettings]             = useState<AppSettings | null>(null);
  const [notifListenerOn,      setNotifListenerOn]      = useState<boolean | null>(null);
  const [screenSecureOn,       setScreenSecureOn]       = useState(true);
  const [spamFilterOn,         setSpamFilterOn]         = useState(true);
  const [autoLockTimeout,      setAutoLockTimeout]      = useState(300);
  const [showAutoLockModal,    setShowAutoLockModal]    = useState(false);
  const [activeLegalDoc,       setActiveLegalDoc]       = useState<LegalDocument | null>(null);
  const [showPanicModal,       setShowPanicModal]       = useState(false);
  const [storageBytes,         setStorageBytes]         = useState<number | null>(null);
  const [messageCount,         setMessageCount]         = useState<number | null>(null);
  const [toastMessage,         setToastMessage]         = useState<string | null>(null);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }

  useEffect(() => {
    loadAppSettings().then(data => {
      if (data) {
        setSettings(data);
        setScreenSecureOn(data.screenSecureEnabled);
        setSpamFilterOn(data.spamFilterEnabled);
        setAutoLockTimeout(data.sessionTimeoutSeconds);
      }
    });

    checkNotificationListenerEnabled().then(setNotifListenerOn);

    Promise.all([getConversations(), getDeletedMessages()]).then(([convs, deleted]) => {
      const totalEstimated = convs.reduce((acc, c) => acc + (c.unreadCount || 1), 0) + deleted.length;
      setMessageCount(totalEstimated);
      setStorageBytes(totalEstimated * 128 + 40960);
    }).catch(() => {
      setMessageCount(0);
      setStorageBytes(40960);
    });
  }, []);

  async function handleToggleScreenSecure(enabled: boolean) {
    setScreenSecureOn(enabled);
    await setScreenSecureNative(enabled);
    showToast(enabled ? 'Screen capture protection enabled' : 'Screen capture protection disabled');
  }

  async function handleToggleSpamFilter(enabled: boolean) {
    setSpamFilterOn(enabled);
    if (settings) {
      const updated: AppSettings = { ...settings, spamFilterEnabled: enabled };
      await saveAppSettings(updated);
      setSettings(updated);
    }
    showToast(enabled ? 'Spam/OTP filter enabled' : 'Spam/OTP filter disabled');
  }

  async function handleSelectAutoLock(value: number) {
    setAutoLockTimeout(value);
    setShowAutoLockModal(false);
    if (settings) {
      const updated: AppSettings = { ...settings, sessionTimeoutSeconds: value };
      await saveAppSettings(updated);
      setSettings(updated);
    }
    showToast('Auto-lock timeout updated');
  }

  function handleLockNow() {
    sessionStorage.removeItem('session_start');
    sessionStorage.removeItem('session_last_active');
    navigate('/login', { replace: true });
  }

  async function handlePanicWipe() {
    setShowPanicModal(false);
    await executePanicWipe();
    sessionStorage.removeItem('session_start');
    sessionStorage.removeItem('session_last_active');
    navigate('/login', { replace: true });
  }

  function formatBytes(bytes: number | null): string {
    if (bytes === null) return 'Calculating...';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const currentTimeoutLabel =
    TIMEOUT_OPTIONS.find(o => o.value === autoLockTimeout)?.label ?? '5 minutes';

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#111827]">
      <TopAppBar
        title="Settings"
        subtitle="NotiCatch Vault & System Controls"
      />

      {/* Action Toast */}
      {toastMessage && (
        <div className="fixed top-16 left-4 right-4 z-50 p-2.5 rounded-xl text-white text-xs font-bold text-center shadow-md animate-slide-down"
          style={{ background: '#2C6BED' }}>
          {toastMessage}
        </div>
      )}

      <main className="flex-1 pt-16 pb-28 px-4 max-w-lg mx-auto w-full space-y-5 animate-slide-up select-none">

        {/* ========================================================
            GROUP 1: VAULT SECURITY
            ======================================================== */}
        <section className="space-y-2">
          <h2 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider px-1">
            Vault Security
          </h2>
          <div className="rounded-2xl border border-[#E5E7EB] bg-white divide-y divide-[#F2F2F7] shadow-xs overflow-hidden">

            {/* Device Screen Lock Status */}
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[#2C6BED] shrink-0 border border-[#DBEAFE]" style={{ background: '#EEF2FF' }}>
                  <Fingerprint className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#111827]">Device Screen Lock</h3>
                  <p className="text-xs text-[#6B7280]">Protected by your device PIN, pattern, or biometrics</p>
                </div>
              </div>
              <span className="flex items-center gap-1 text-[0.65rem] font-bold text-emerald-600 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" /> Protected
              </span>
            </div>

            {/* Inactivity Auto-Lock */}
            <button
              type="button"
              id="row-inactivity-autolock"
              onClick={() => setShowAutoLockModal(true)}
              className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-[#F8F9FA] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[#7C3AED] shrink-0 border border-purple-200" style={{ background: '#F5F3FF' }}>
                  <Clock className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#111827]">Inactivity Auto-Lock</h3>
                  <p className="text-xs text-[#6B7280]">Locks vault when inactive for {currentTimeoutLabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 text-[#6B7280]">
                <span className="text-xs font-semibold text-[#2C6BED]">{currentTimeoutLabel}</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>

            {/* Screen Capture Protection (FLAG_SECURE) */}
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[#059669] shrink-0 border border-emerald-200" style={{ background: '#ECFDF5' }}>
                  <EyeOff className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#111827]">Screen Capture Protection</h3>
                  <p className="text-xs text-[#6B7280]">Blocks screenshots, recordings, and app preview</p>
                </div>
              </div>
              <ToggleSwitch
                id="toggle-screen-secure"
                checked={screenSecureOn}
                onChange={handleToggleScreenSecure}
                label="Screen Capture Protection"
              />
            </div>
          </div>
        </section>

        {/* ========================================================
            GROUP 2: INTERCEPTION STATUS & PERMISSIONS
            ======================================================== */}
        <section className="space-y-2">
          <h2 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider px-1">
            Interception & Background Capture
          </h2>
          <div className="rounded-2xl border border-[#E5E7EB] bg-white divide-y divide-[#F2F2F7] shadow-xs overflow-hidden">

            {/* Notification Listener Access — DIRECT TRIGGER */}
            <button
              type="button"
              id="row-notification-listener-direct"
              onClick={requestNotificationListenerPermission}
              className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-[#F8F9FA] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[#2C6BED] shrink-0 border border-[#DBEAFE]" style={{ background: '#EEF2FF' }}>
                  <Bell className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#111827]">Notification Listener Service</h3>
                    {notifListenerOn === true ? (
                      <span className="flex items-center gap-1 text-[0.65rem] font-bold text-emerald-600 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[0.65rem] font-bold text-amber-600 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200">
                        <AlertTriangle className="w-3 h-3" /> Action Required
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#6B7280]">Tap to open Android Notification Access settings</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-[#6B7280] shrink-0" />
            </button>

            {/* Battery Saver Optimization — DIRECT TRIGGER */}
            <button
              type="button"
              id="row-battery-exemption-direct"
              onClick={requestBatteryExemptionNative}
              className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-[#F8F9FA] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[#D97706] shrink-0 border border-amber-200" style={{ background: '#FFF4E5' }}>
                  <BatteryCharging className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#111827]">Battery Optimization Exemption</h3>
                  <p className="text-xs text-[#6B7280]">Tap to exempt NotiCatch from Android background sleep</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-[#6B7280] shrink-0" />
            </button>

            {/* Noise / Spam Filter */}
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[#2C6BED] shrink-0 border border-[#DBEAFE]" style={{ background: '#EEF2FF' }}>
                  <Filter className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#111827]">Noise / Spam Filter</h3>
                  <p className="text-xs text-[#6B7280]">Hides system alerts, OTPs, and irrelevant messages</p>
                </div>
              </div>
              <ToggleSwitch
                id="toggle-spam-filter"
                checked={spamFilterOn}
                onChange={handleToggleSpamFilter}
                label="Noise and spam filter"
              />
            </div>

            {/* All Permissions Sub-page */}
            <button
              type="button"
              id="row-permissions-subpage"
              onClick={() => navigate('/settings/permissions')}
              className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-[#F8F9FA] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[#4B5563] shrink-0 border border-[#E5E7EB]" style={{ background: '#F3F4F6' }}>
                  <Shield className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#111827]">Permissions Management</h3>
                  <p className="text-xs text-[#6B7280]">View all 4 background system access controls</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#6B7280] shrink-0" />
            </button>
          </div>
        </section>

        {/* ========================================================
            GROUP 3: DATA & EXPORT
            ======================================================== */}
        <section className="space-y-2">
          <h2 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider px-1">
            Data Storage & Export
          </h2>
          <div className="rounded-2xl border border-[#E5E7EB] bg-white divide-y divide-[#F2F2F7] shadow-xs overflow-hidden">

            {/* Storage Statistics */}
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[#D97706] shrink-0 border border-amber-200" style={{ background: '#FFF4E5' }}>
                  <HardDrive className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#111827]">Storage Statistics</h3>
                  <p className="text-xs text-[#6B7280]">
                    {messageCount !== null ? `${messageCount} messages archived` : 'Local Room SQLite WAL'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-[#6B7280]">{formatBytes(storageBytes)}</span>
            </div>

            {/* Export All as PDF */}
            <button
              type="button"
              id="row-export-pdf"
              onClick={async () => {
                await exportChatAsPDFNative('all', 'All Conversations');
                showToast('PDF export dossier generated');
              }}
              className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-[#F8F9FA] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[#DC2626] shrink-0 border border-red-200" style={{ background: '#FEF2F2' }}>
                  <FileText className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#111827]">Export All as PDF</h3>
                  <p className="text-xs text-[#6B7280]">Generate offline document dossier of all conversations</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#6B7280] shrink-0" />
            </button>

            {/* Export All as CSV */}
            <button
              type="button"
              id="row-export-csv"
              onClick={async () => {
                await exportChatAsCSVNative('all', 'All Conversations');
                showToast('CSV database backup exported');
              }}
              className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-[#F8F9FA] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[#059669] shrink-0 border border-emerald-200" style={{ background: '#ECFDF5' }}>
                  <Share2 className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#111827]">Export All as CSV</h3>
                  <p className="text-xs text-[#6B7280]">Export tabular spreadsheet backup with SHA-256 signatures</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#6B7280] shrink-0" />
            </button>
          </div>
        </section>

        {/* ========================================================
            GROUP 4: SUPPORT & LEGAL
            ======================================================== */}
        <section className="space-y-2">
          <h2 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider px-1">
            Support & Legal
          </h2>
          <div className="rounded-2xl border border-[#E5E7EB] bg-white divide-y divide-[#F2F2F7] shadow-xs overflow-hidden">

            {/* Help & Diagnostics */}
            <button
              type="button"
              id="row-help-support"
              onClick={() => navigate('/feedback')}
              className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-[#F8F9FA] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[#2C6BED] shrink-0 border border-[#DBEAFE]" style={{ background: '#EEF2FF' }}>
                  <HelpCircle className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#111827]">Help & Support</h3>
                  <p className="text-xs text-[#6B7280]">Diagnostic payload and feedback submission</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#6B7280] shrink-0" />
            </button>

            {/* Contact Developer */}
            <button
              type="button"
              id="row-contact-developer"
              onClick={() => navigate('/contact')}
              className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-[#F8F9FA] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[#D97706] shrink-0 border border-amber-200" style={{ background: '#FFF4E5' }}>
                  <Mail className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#111827]">Contact Developer</h3>
                  <p className="text-xs text-[#6B7280]">kushshah.ce@gmail.com</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#6B7280] shrink-0" />
            </button>

            {/* GitHub Repository */}
            <a
              id="link-github-repo"
              href="https://github.com/kush1310/DeletedMsgReader"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-[#F8F9FA] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[#111827] shrink-0 border border-[#E5E7EB]" style={{ background: '#F3F4F6' }}>
                  <Github className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#111827]">GitHub Repository</h3>
                  <p className="text-xs text-[#6B7280]">Source code, releases, and issue tracker</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-[#6B7280] shrink-0" />
            </a>

            {/* Privacy Policy */}
            <button
              type="button"
              id="row-privacy-policy"
              onClick={() => setActiveLegalDoc(PRIVACY_POLICY)}
              className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-[#F8F9FA] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[#059669] shrink-0 border border-emerald-200" style={{ background: '#ECFDF5' }}>
                  <Shield className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#111827]">Privacy Policy</h3>
                  <p className="text-xs text-[#6B7280]">100% offline, zero-network architecture guarantees</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#6B7280] shrink-0" />
            </button>

            {/* Terms of Service */}
            <button
              type="button"
              id="row-terms-of-service"
              onClick={() => setActiveLegalDoc(TERMS_OF_SERVICE)}
              className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-[#F8F9FA] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[#7C3AED] shrink-0 border border-purple-200" style={{ background: '#F5F3FF' }}>
                  <FileText className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#111827]">Terms of Service</h3>
                  <p className="text-xs text-[#6B7280]">Usage guidelines and personal backup license</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#6B7280] shrink-0" />
            </button>

            {/* App Version */}
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[#2C6BED] shrink-0 border border-[#DBEAFE]" style={{ background: '#EEF2FF' }}>
                  <Shield className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#111827]">App Version</h3>
                  <p className="text-xs text-[#6B7280]">Production release build</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-[#2C6BED] px-2.5 py-1 rounded-full border border-[#DBEAFE]" style={{ background: '#EEF2FF' }}>
                v1.6.3
              </span>
            </div>
          </div>
        </section>

        {/* ========================================================
            DANGER ZONE: LOCK & PANIC WIPE
            ======================================================== */}
        <section className="space-y-2">
          <h2 className="text-xs font-bold text-rose-600 uppercase tracking-wider px-1">
            Danger Zone
          </h2>
          <div className="rounded-2xl border border-rose-200 bg-white divide-y divide-rose-100 shadow-xs overflow-hidden">

            {/* Lock Vault Now */}
            <button
              type="button"
              id="btn-lock-vault-now"
              onClick={handleLockNow}
              className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-rose-50/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-rose-600 shrink-0 border border-rose-200" style={{ background: '#FFF1F2' }}>
                  <Lock className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-rose-700">Lock Vault Now</h3>
                  <p className="text-xs text-[#6B7280]">Immediately requires device screen pass to re-enter</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-rose-400 shrink-0" />
            </button>

            {/* Panic Wipe / Erase All Data */}
            <button
              type="button"
              id="btn-panic-wipe-open"
              onClick={() => setShowPanicModal(true)}
              className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-rose-50/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-rose-600 shrink-0 border border-rose-200" style={{ background: '#FFF1F2' }}>
                  <Trash2 className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-rose-700">Erase All Data (Panic Wipe)</h3>
                  <p className="text-xs text-[#6B7280]">Permanently drops all database tables and resets app</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-rose-400 shrink-0" />
            </button>
          </div>
        </section>
      </main>

      {/* Auto-Lock Picker Modal */}
      {showAutoLockModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setShowAutoLockModal(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-xl border border-[#E5E7EB] animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-[#111827] mb-1">Inactivity Auto-Lock</h3>
            <p className="text-xs text-[#6B7280] mb-4">Choose how long to wait before requiring device re-authentication.</p>

            <div className="space-y-2">
              {TIMEOUT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  id={`autolock-opt-${opt.value}`}
                  onClick={() => handleSelectAutoLock(opt.value)}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-between border transition-all ${
                    autoLockTimeout === opt.value
                      ? 'border-[#2C6BED] text-[#2C6BED] bg-[#EEF2FF]'
                      : 'border-[#E5E7EB] text-[#111827] bg-[#F8F9FA] hover:bg-[#F3F4F6]'
                  }`}
                >
                  <span>{opt.label}</span>
                  {autoLockTimeout === opt.value && <CheckCircle2 className="w-4 h-4 text-[#2C6BED]" />}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowAutoLockModal(false)}
              className="w-full mt-4 py-2.5 rounded-xl border border-[#E5E7EB] text-xs font-bold text-[#6B7280]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Panic Wipe Confirmation Modal */}
      <ConfirmationModal
        isOpen={showPanicModal}
        title="Permanently Erase All Data?"
        description="This action will instantly shred all SQLite database tables, purge every captured message, and reset NotiCatch to fresh installation state. This action is irreversible."
        confirmLabel="Erase Everything"
        cancelLabel="Cancel"
        isDangerous={true}
        confirmVariant="danger"
        onConfirm={handlePanicWipe}
        onCancel={() => setShowPanicModal(false)}
      />

      {/* Legal Document Viewer Modal */}
      <LegalDocumentModal
        isOpen={activeLegalDoc !== null}
        document={activeLegalDoc}
        onClose={() => setActiveLegalDoc(null)}
      />
    </div>
  );
}
