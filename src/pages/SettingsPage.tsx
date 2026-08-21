/**
 * SettingsPage.tsx
 *
 * System Settings Hub for NotiCatch — 100% application-specific.
 *
 * Visual system: Signal Android Settings — clean white grouped list with
 * section headers, icon-prefixed rows, toggle switches, and chevron navigation.
 * No hamburger button. No sidebar drawer.
 *
 * All Claude-specific content has been completely removed:
 * - "Want more Claude?" promo banner
 * - "Capabilities (4 enabled)" and "Connectors" rows
 * - "Billing" and "Voice" rows
 * - Free / Vault tier badges
 * - Hardcoded email in account card
 *
 * Settings are organized into 5 application-specific groups:
 * 1. Vault Security (biometric, auto-lock, screen protection, PIN)
 * 2. Interception Status (notification listener, battery exemption, spam filter)
 * 3. Appearance (color mode, haptic feedback)
 * 4. Data & Export (PDF, CSV, storage stats)
 * 5. Support & Legal (help, contact, privacy, terms, version)
 * Danger Zone: Lock Vault, Panic Wipe
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Fingerprint,
  Clock,
  Shield,
  Lock,
  Bell,
  Zap,
  ListFilter,
  Moon,
  Vibrate,
  FileText,
  Share2,
  Database,
  HelpCircle,
  Mail,
  ScrollText,
  LogOut,
  Trash2,
  ChevronRight,
  Info,
  Download,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  ToggleSwitch,
  ConfirmationModal,
  ColorModeModal,
  FontStyleModal,
  LegalDocumentModal,
  type ColorMode,
  type FontStyle,
} from '@/components/common';
import {
  loadAppSettings,
  saveAppSettings,
  exportChatAsPDFNative,
  exportChatAsCSVNative,
  executePanicWipe,
  checkNotificationListenerEnabled,
  isNativeAndroid,
} from '@/services/NativeBridgeService';
import { PRIVACY_POLICY, TERMS_OF_SERVICE, type LegalDocument } from '@/data/legalContent';
import type { AppSettings } from '@/types';

/* ============================================================
   Section Header Component
   ============================================================ */

function SectionHeader({ label }: { readonly label: string }) {
  return (
    <div className="px-4 pt-5 pb-1.5">
      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#6B7280' }}>
        {label}
      </span>
    </div>
  );
}

/* ============================================================
   Settings Row Components
   ============================================================ */

interface RowProps {
  readonly id: string;
  readonly icon: React.ReactNode;
  readonly iconBg: string;
  readonly label: string;
  readonly subtitle?: string;
  readonly trailing?: React.ReactNode;
  readonly onClick?: () => void;
}

function SettingsRow({ id, icon, iconBg, label, subtitle, trailing, onClick }: RowProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      id={id}
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-[#F8F9FA] active:bg-[#F2F2F7]"
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: iconBg }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-[#111827]">{label}</span>
        {subtitle && (
          <span className="block text-xs text-[#9CA3AF] font-medium mt-0.5 truncate">{subtitle}</span>
        )}
      </div>
      {trailing ?? (onClick ? <ChevronRight className="w-4 h-4 text-[#D1D5DB] flex-shrink-0" /> : null)}
    </Tag>
  );
}

function ToggleRow({ id, icon, iconBg, label, subtitle, checked, onChange }: {
  readonly id: string;
  readonly icon: React.ReactNode;
  readonly iconBg: string;
  readonly label: string;
  readonly subtitle?: string;
  readonly checked: boolean;
  readonly onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3.5 px-4 py-3.5">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: iconBg }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-[#111827]">{label}</span>
        {subtitle && (
          <span className="block text-xs text-[#9CA3AF] font-medium mt-0.5">{subtitle}</span>
        )}
      </div>
      <ToggleSwitch id={id} checked={checked} onChange={onChange} />
    </div>
  );
}

function DangerRow({ id, icon, label, onClick }: {
  readonly id: string;
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly onClick: () => void;
}) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-rose-50 active:bg-rose-100"
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-rose-50">
        {icon}
      </div>
      <span className="text-sm font-bold text-rose-700">{label}</span>
    </button>
  );
}

/* ============================================================
   SettingsPage
   ============================================================ */

export function SettingsPage() {
  const navigate  = useNavigate();
  const isNative  = isNativeAndroid();

  const [settings, setSettings] = useState<AppSettings>({
    biometricEnabled:      true,
    isPinSet:              true,
    isDuressPinSet:        false,
    sessionTimeoutSeconds: 300,
    screenSecureEnabled:   true,
    airGapModeActive:      true,
    spamFilterEnabled:     true,
    theme:                 'light',
    lastIntegrityCheck:    null,
    databaseVersion:       1,
    hapticsEnabled:        true,
    colorMode:             'system',
    fontStyle:             'default',
  });

  const [showColorModal,    setShowColorModal]    = useState(false);
  const [showFontModal,     setShowFontModal]     = useState(false);
  const [showTimeModal,     setShowTimeModal]     = useState(false);
  const [showExportModal,   setShowExportModal]   = useState(false);
  const [showLogoutModal,   setShowLogoutModal]   = useState(false);
  const [showWipeModal,     setShowWipeModal]     = useState(false);
  const [activeLegalDoc,    setActiveLegalDoc]    = useState<LegalDocument | null>(null);
  const [isProcessing,      setIsProcessing]      = useState(false);
  const [hapticsActive,     setHapticsActive]     = useState(
    () => localStorage.getItem('noticatch_haptics') !== 'false'
  );
  const [notifListenerOn,   setNotifListenerOn]   = useState<boolean | null>(null);

  useEffect(() => {
    loadAppSettings().then(setSettings);
    if (isNative) {
      checkNotificationListenerEnabled().then(setNotifListenerOn);
    } else {
      setNotifListenerOn(true);
    }
  }, [isNative]);

  /**
   * updateSetting
   *
   * Merges a single key-value pair into the settings object and persists
   * the updated state to the on-device SQLite preferences store.
   *
   * @param key   - AppSettings property key to update.
   * @param value - New value for the property.
   */
  async function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await saveAppSettings(updated);
  }

  function handleToggleHaptics(val: boolean): void {
    setHapticsActive(val);
    localStorage.setItem('noticatch_haptics', String(val));
    updateSetting('hapticsEnabled', val);
  }

  /**
   * handleLogout
   *
   * Clears session tokens from sessionStorage and redirects to the Login
   * screen, triggering the biometric/PIN authentication gate.
   *
   * @redirects - /login (replace: true — prevents back navigation to settings)
   */
  function handleLogout(): void {
    sessionStorage.removeItem('session_start');
    sessionStorage.removeItem('session_last_active');
    navigate('/login', { replace: true });
  }

  /**
   * handlePermanentWipe
   *
   * Executes the Panic Wipe sequence: erases all data from the Room SQLite DB,
   * clears all shared preferences, and navigates to the Setup wizard so the
   * user must re-grant all Android permissions from scratch.
   *
   * @edge-cases - Sets isProcessing during the async wipe to prevent double-tap.
   * @redirects  - /setup (replace: true) on successful wipe.
   */
  async function handlePermanentWipe(): Promise<void> {
    setIsProcessing(true);
    await executePanicWipe();
    setIsProcessing(false);
    setShowWipeModal(false);
    navigate('/setup', { replace: true });
  }

  const timeoutLabels: Record<number, string> = {
    60:   '1 minute',
    300:  '5 minutes',
    900:  '15 minutes',
    1800: '30 minutes',
    0:    'Never',
  };

  const currentTimeoutLabel = timeoutLabels[settings.sessionTimeoutSeconds] ?? '5 minutes';

  /* ============================================================
     Render
     ============================================================ */
  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2F7] text-[#111827]">

      {/* Top App Bar — Signal White — no hamburger */}
      <header className="fixed top-0 left-0 right-0 z-30 border-b pt-safe"
        style={{ background: 'rgba(255,255,255,0.97)', borderColor: '#E5E7EB', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-lg font-bold text-[#111827] tracking-tight">
            Settings
          </h1>
          <button
            type="button"
            id="settings-info-button"
            onClick={() => setActiveLegalDoc(PRIVACY_POLICY)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[#4B5563] hover:bg-[#F2F2F7] transition-colors"
          >
            <Info className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* Settings Content */}
      <main className="flex-1 pt-16 pb-28 max-w-lg mx-auto w-full animate-slide-up">

        {/* ======================================================
            GROUP 1: Vault Security
            ====================================================== */}
        <SectionHeader label="Vault Security" />
        <div className="bg-white rounded-2xl overflow-hidden border border-[#E5E7EB] mx-4 divide-y divide-[#F2F2F7]">
          <ToggleRow
            id="toggle-biometric"
            icon={<Fingerprint className="w-5 h-5 text-[#2C6BED]" strokeWidth={2} />}
            iconBg="#EEF2FF"
            label="Biometric Unlock"
            subtitle={settings.biometricEnabled ? 'Fingerprint / Face ID active' : 'Disabled'}
            checked={settings.biometricEnabled}
            onChange={val => updateSetting('biometricEnabled', val)}
          />

          <SettingsRow
            id="settings-autolock-row"
            icon={<Clock className="w-5 h-5 text-[#7C3AED]" strokeWidth={2} />}
            iconBg="#F5F3FF"
            label="Inactivity Auto-Lock"
            subtitle={`Locks after ${currentTimeoutLabel}`}
            onClick={() => setShowTimeModal(true)}
          />

          <ToggleRow
            id="toggle-screen-secure"
            icon={<Shield className="w-5 h-5 text-[#059669]" strokeWidth={2} />}
            iconBg="#F0FDF4"
            label="Screen Capture Protection"
            subtitle="FLAG_SECURE — blocks screenshots & screen recording"
            checked={settings.screenSecureEnabled}
            onChange={val => updateSetting('screenSecureEnabled', val)}
          />

          <SettingsRow
            id="settings-pin-row"
            icon={<Lock className="w-5 h-5 text-[#DC2626]" strokeWidth={2} />}
            iconBg="#FEF2F2"
            label="Change Master PIN"
            subtitle={settings.isPinSet ? 'PIN is set' : 'No PIN configured'}
            onClick={() => navigate('/settings/security')}
          />
        </div>

        {/* ======================================================
            GROUP 2: Interception Status
            ====================================================== */}
        <SectionHeader label="Interception Status" />
        <div className="bg-white rounded-2xl overflow-hidden border border-[#E5E7EB] mx-4 divide-y divide-[#F2F2F7]">
          <SettingsRow
            id="settings-notif-listener-row"
            icon={<Bell className="w-5 h-5 text-[#2C6BED]" strokeWidth={2} />}
            iconBg="#EEF2FF"
            label="Notification Listener Service"
            subtitle={
              notifListenerOn === null ? 'Checking...' :
              notifListenerOn ? 'Active — capturing WhatsApp notifications' :
              'Disabled — tap to enable in system settings'
            }
            trailing={
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {notifListenerOn === true && <CheckCircle2 className="w-4 h-4 text-[#059669]" strokeWidth={2.2} />}
                {notifListenerOn === false && <XCircle className="w-4 h-4 text-[#DC2626]" strokeWidth={2.2} />}
                {notifListenerOn !== null && <ChevronRight className="w-4 h-4 text-[#D1D5DB]" />}
              </div>
            }
            onClick={() => navigate('/settings/permissions')}
          />

          <SettingsRow
            id="settings-battery-row"
            icon={<Zap className="w-5 h-5 text-[#D97706]" strokeWidth={2} />}
            iconBg="#FFF7ED"
            label="Battery Optimization Exemption"
            subtitle="Prevents Android from killing the listener service"
            onClick={() => navigate('/settings/permissions')}
          />

          <ToggleRow
            id="toggle-spam-filter"
            icon={<ListFilter className="w-5 h-5 text-[#0284C7]" strokeWidth={2} />}
            iconBg="#F0F9FF"
            label="Noise / Spam Filter"
            subtitle="Hides system notifications and irrelevant messages"
            checked={settings.spamFilterEnabled}
            onChange={val => updateSetting('spamFilterEnabled', val)}
          />
        </div>

        {/* ======================================================
            GROUP 3: Appearance
            ====================================================== */}
        <SectionHeader label="Appearance" />
        <div className="bg-white rounded-2xl overflow-hidden border border-[#E5E7EB] mx-4 divide-y divide-[#F2F2F7]">
          <SettingsRow
            id="settings-color-mode-row"
            icon={<Moon className="w-5 h-5 text-[#6D28D9]" strokeWidth={2} />}
            iconBg="#F5F3FF"
            label="Color Mode"
            subtitle={`Currently: ${String(settings.colorMode ?? 'System').charAt(0).toUpperCase()}${String(settings.colorMode ?? 'system').slice(1)}`}
            onClick={() => setShowColorModal(true)}
          />

          <ToggleRow
            id="toggle-haptics"
            icon={<Vibrate className="w-5 h-5 text-[#0284C7]" strokeWidth={2} />}
            iconBg="#F0F9FF"
            label="Keypad Haptic Feedback"
            subtitle="Vibration on PIN keypad taps"
            checked={hapticsActive}
            onChange={handleToggleHaptics}
          />
        </div>

        {/* ======================================================
            GROUP 4: Data & Export
            ====================================================== */}
        <SectionHeader label="Data & Export" />
        <div className="bg-white rounded-2xl overflow-hidden border border-[#E5E7EB] mx-4 divide-y divide-[#F2F2F7]">
          <SettingsRow
            id="settings-export-pdf-row"
            icon={<FileText className="w-5 h-5 text-[#2C6BED]" strokeWidth={2} />}
            iconBg="#EEF2FF"
            label="Export All Chats as PDF"
            subtitle="Generates a formatted PDF dossier to device storage"
            onClick={() => setShowExportModal(true)}
          />

          <SettingsRow
            id="settings-export-csv-row"
            icon={<Share2 className="w-5 h-5 text-[#059669]" strokeWidth={2} />}
            iconBg="#F0FDF4"
            label="Export All Chats as CSV"
            subtitle="Spreadsheet format — compatible with Excel, Sheets"
            onClick={async () => { await exportChatAsCSVNative('all'); }}
          />

          <SettingsRow
            id="settings-storage-row"
            icon={<Database className="w-5 h-5 text-[#D97706]" strokeWidth={2} />}
            iconBg="#FFF7ED"
            label="Storage Statistics"
            subtitle="Room SQLite WAL · On-device encrypted vault"
            trailing={
              <span className="text-xs font-bold text-[#9CA3AF] flex-shrink-0">
                {(settings.databaseVersion ?? 1)} version
              </span>
            }
          />
        </div>

        {/* ======================================================
            GROUP 5: Support & Legal
            ====================================================== */}
        <SectionHeader label="Support & Legal" />
        <div className="bg-white rounded-2xl overflow-hidden border border-[#E5E7EB] mx-4 divide-y divide-[#F2F2F7]">
          <SettingsRow
            id="settings-help-row"
            icon={<HelpCircle className="w-5 h-5 text-[#2C6BED]" strokeWidth={2} />}
            iconBg="#EEF2FF"
            label="Help & Support"
            subtitle="Diagnostics, feedback, and issue reporting"
            onClick={() => navigate('/feedback')}
          />

          <SettingsRow
            id="settings-contact-row"
            icon={<Mail className="w-5 h-5 text-[#059669]" strokeWidth={2} />}
            iconBg="#F0FDF4"
            label="Contact Developer"
            subtitle="Security disclosures and direct support"
            onClick={() => navigate('/contact')}
          />

          <SettingsRow
            id="settings-privacy-row"
            icon={<ScrollText className="w-5 h-5 text-[#6B7280]" strokeWidth={2} />}
            iconBg="#F9FAFB"
            label="Privacy Policy"
            subtitle="100% on-device, air-gap zero egress"
            onClick={() => setActiveLegalDoc(PRIVACY_POLICY)}
          />

          <SettingsRow
            id="settings-terms-row"
            icon={<ScrollText className="w-5 h-5 text-[#6B7280]" strokeWidth={2} />}
            iconBg="#F9FAFB"
            label="Terms of Service"
            onClick={() => setActiveLegalDoc(TERMS_OF_SERVICE)}
          />

          {/* App version — non-interactive */}
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#F9FAFB]">
                <Info className="w-5 h-5 text-[#9CA3AF]" strokeWidth={2} />
              </div>
              <span className="text-sm font-semibold text-[#111827]">App Version</span>
            </div>
            <span className="text-sm font-bold text-[#9CA3AF]">v1.6.3</span>
          </div>
        </div>

        {/* ======================================================
            DANGER ZONE
            ====================================================== */}
        <SectionHeader label="Danger Zone" />
        <div className="bg-white rounded-2xl overflow-hidden border border-[#FFE4E6] mx-4 divide-y divide-[#FFF1F2]">
          <DangerRow
            id="settings-logout-button"
            icon={<LogOut className="w-5 h-5 text-rose-600" strokeWidth={2} />}
            label="Lock Vault Now"
            onClick={() => setShowLogoutModal(true)}
          />
          <DangerRow
            id="settings-wipe-button"
            icon={<Trash2 className="w-5 h-5 text-rose-700" strokeWidth={2} />}
            label="Erase All Data — Panic Wipe"
            onClick={() => setShowWipeModal(true)}
          />
        </div>

        {/* Bottom safe space */}
        <div className="h-6" />
      </main>

      {/* ===== Modals ===== */}

      <ColorModeModal
        isOpen={showColorModal}
        currentMode={(settings.colorMode as ColorMode) || 'system'}
        onSelect={mode => updateSetting('colorMode', mode)}
        onClose={() => setShowColorModal(false)}
      />

      <FontStyleModal
        isOpen={showFontModal}
        currentStyle={(settings.fontStyle as FontStyle) || 'default'}
        onSelect={style => updateSetting('fontStyle', style)}
        onClose={() => setShowFontModal(false)}
      />

      {/* Auto-Lock Timeout Picker */}
      {showTimeModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in"
          onClick={() => setShowTimeModal(false)}
        >
          <div
            className="w-full max-w-xs bg-white rounded-3xl p-5 shadow-xl border border-[#E5E7EB] animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-[#111827] mb-4 px-1">
              Inactivity Auto-Lock
            </h3>
            <div className="space-y-1">
              {[
                { seconds: 60,   label: '1 minute' },
                { seconds: 300,  label: '5 minutes' },
                { seconds: 900,  label: '15 minutes' },
                { seconds: 1800, label: '30 minutes' },
                { seconds: 0,    label: 'Never' },
              ].map(opt => (
                <button
                  key={opt.seconds}
                  type="button"
                  onClick={() => {
                    updateSetting('sessionTimeoutSeconds', opt.seconds);
                    setShowTimeModal(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-left text-sm font-semibold transition-colors ${
                    settings.sessionTimeoutSeconds === opt.seconds
                      ? 'text-[#2C6BED] font-bold'
                      : 'text-[#111827] hover:bg-[#F8F9FA]'
                  }`}
                  style={
                    settings.sessionTimeoutSeconds === opt.seconds
                      ? { background: '#EEF2FF' }
                      : {}
                  }
                >
                  <span>{opt.label}</span>
                  {settings.sessionTimeoutSeconds === opt.seconds && (
                    <CheckCircle2 className="w-4 h-4 text-[#2C6BED]" strokeWidth={2.5} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Export Selection Modal */}
      {showExportModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in"
          onClick={() => setShowExportModal(false)}
        >
          <div
            className="w-full max-w-xs bg-white rounded-3xl p-5 shadow-xl border border-[#E5E7EB] animate-scale-in space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-[#111827] px-1">Export Chat History</h3>
            <p className="text-xs text-[#9CA3AF] px-1 font-medium">
              Save all captured conversations to your device storage.
            </p>
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={async () => {
                  setShowExportModal(false);
                  await exportChatAsPDFNative('all');
                }}
                className="w-full py-3 px-4 rounded-2xl text-[#111827] font-semibold text-sm flex items-center gap-2 transition-colors hover:bg-[#F8F9FA]"
                style={{ background: '#F2F2F7' }}
              >
                <Download className="w-4 h-4 text-[#2C6BED]" />
                <span>Export as PDF Dossier</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowExportModal(false);
                  await exportChatAsCSVNative('all');
                }}
                className="w-full py-3 px-4 rounded-2xl text-[#111827] font-semibold text-sm flex items-center gap-2 transition-colors hover:bg-[#F8F9FA]"
                style={{ background: '#F2F2F7' }}
              >
                <Download className="w-4 h-4 text-[#059669]" />
                <span>Export as CSV Spreadsheet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lock Vault Confirmation */}
      <ConfirmationModal
        isOpen={showLogoutModal}
        title="Lock Vault"
        description="Lock the vault now? Biometric or PIN authentication will be required upon return."
        confirmLabel="Lock Vault"
        cancelLabel="Cancel"
        confirmVariant="primary"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />

      {/* Panic Wipe Confirmation */}
      <ConfirmationModal
        isOpen={showWipeModal}
        title="Erase All Data"
        description="This permanently deletes all stored messages and encryption keys from the device. This action cannot be reversed."
        confirmLabel="Wipe Everything"
        cancelLabel="Cancel"
        confirmVariant="danger"
        isLoading={isProcessing}
        onConfirm={handlePermanentWipe}
        onCancel={() => setShowWipeModal(false)}
      />

      {/* Legal Document Viewer */}
      {activeLegalDoc && (
        <LegalDocumentModal
          isOpen={true}
          document={activeLegalDoc}
          onClose={() => setActiveLegalDoc(null)}
        />
      )}
    </div>
  );
}
