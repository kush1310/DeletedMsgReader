/**
 * SettingsPage
 *
 * Configuration and system permission manager for NotiCatch.
 * Styled in Anthropic Claude warm editorial aesthetic.
 * All technical and algorithmic jargon removed for a clean, premium consumer experience.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Clock,
  Filter,
  Trash2,
  Download,
  LogOut,
  ChevronDown,
  FileText,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Lock,
  X,
  KeyRound,
  FileCheck2,
} from 'lucide-react';
import { TopAppBar } from '@/components/navigation';
import { SettingsRow, ToggleSwitch, LoadingSpinner, ConfirmationModal, LegalDocumentModal } from '@/components/common';
import { PRIVACY_POLICY, TERMS_OF_SERVICE, type LegalDocument } from '@/data/legalContent';
import {
  loadAppSettings,
  persistAppSettings,
  wipeAllDataNative,
  exportChatAsPDFNative,
  exportChatAsCSVNative,
  getConversations,
  setSpamFilterNative,
  setScreenSecureNative,
  setSessionTimeoutNative,
  checkNotificationListenerEnabled,
  requestNotificationListenerPermission,
  openAutostartSettingsNative,
  requestBatteryExemptionNative,
  isNativeAndroid,
} from '@/services/NativeBridgeService';
import type { AppSettings, Conversation } from '@/types';

const DEFAULT_SETTINGS: AppSettings = {
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
};

type ModalType = 'logout' | 'wipe' | 'export' | 'duress-pin' | null;

export function SettingsPage() {
  const navigate = useNavigate();
  const isNative = isNativeAndroid();

  const [settings,          setSettings]          = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading,         setIsLoading]         = useState(true);
  const [showTimeoutPicker, setShowTimeoutPicker] = useState(false);
  const [activeModal,       setActiveModal]       = useState<ModalType>(null);
  const [activeLegalDoc,    setActiveLegalDoc]    = useState<LegalDocument | null>(null);
  const [conversations,     setConversations]     = useState<Conversation[]>([]);
  const [exportingChatId,   setExportingChatId]   = useState<string | null>(null);
  const [exportSuccessMsg,  setExportSuccessMsg]  = useState<string | null>(null);
  const [isWiping,          setIsWiping]          = useState(false);
  const [notifAccessGranted, setNotifAccessGranted] = useState<boolean | null>(null);
  const [duressInput,       setDuressInput]       = useState('');
  const [duressSuccess,     setDuressSuccess]     = useState<string | null>(null);

  const checkPermissions = useCallback(async (): Promise<void> => {
    if (!isNative) {
      setNotifAccessGranted(true);
      return;
    }
    const granted = await checkNotificationListenerEnabled();
    setNotifAccessGranted(granted);
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
    navigate('/login', { replace: true });
  }

  async function handleWipeConfirm(): Promise<void> {
    setIsWiping(true);
    await wipeAllDataNative();
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
    const result = await exportChatAsPDFNative(conversationId, chatTitle);
    setExportingChatId(null);
    if (result.filePath) {
      setExportSuccessMsg(`Exported ${result.rowCount} messages to PDF`);
      setTimeout(() => setExportSuccessMsg(null), 3000);
    }
  }

  async function handleExportCSV(conversationId: string, chatTitle: string): Promise<void> {
    setExportingChatId(conversationId);
    const result = await exportChatAsCSVNative(conversationId, chatTitle);
    setExportingChatId(null);
    if (result.filePath) {
      setExportSuccessMsg(`Exported ${result.rowCount} messages to CSV`);
      setTimeout(() => setExportSuccessMsg(null), 3000);
    }
  }

  async function handleSaveDuressPin(): Promise<void> {
    if (duressInput.length === 4) {
      localStorage.setItem('duress_pin_noticatch', duressInput);
      setDuressSuccess('Decoy Emergency PIN activated.');
      setTimeout(() => {
        setDuressSuccess(null);
        setActiveModal(null);
        setDuressInput('');
      }, 1500);
    }
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
      <div className="flex flex-col h-full bg-canvas">
        <TopAppBar title="Settings" />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-canvas pb-20">
      <TopAppBar title="Settings" />

      <div className="flex-1 overflow-y-auto pt-14 divide-y divide-surface-700">

        {/* Essential Setup Guide */}
        <section className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <h2 className="text-2xs font-bold text-content-secondary uppercase tracking-widest">
              Required Setup for Background Capture
            </h2>
            <span
              className={`inline-flex items-center gap-1 text-2xs font-bold px-2 py-0.5 rounded-full ${
                notifAccessGranted
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border border-amber-200'
              }`}
            >
              {notifAccessGranted ? (
                <>
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Active
                </>
              ) : (
                <>
                  <AlertTriangle className="w-2.5 h-2.5" />
                  Setup Needed
                </>
              )}
            </span>
          </div>

          <div className="card overflow-hidden divide-y divide-surface-700 shadow-card">
            {/* Step 1 */}
            <div className="p-3.5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-accent-muted flex items-center justify-center text-accent shrink-0 font-bold text-xs">
                1
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-content-primary">Notification Access</h3>
                  <button
                    type="button"
                    onClick={requestNotificationListenerPermission}
                    className="text-2xs font-bold text-accent hover:underline"
                  >
                    Open Settings →
                  </button>
                </div>
                <p className="text-2xs text-content-muted mt-0.5 leading-relaxed">
                  Allow NotiCatch to read incoming message notifications in Android Settings.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-3.5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-surface-850 flex items-center justify-center text-accent shrink-0 font-bold text-xs border border-surface-700">
                2
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-content-primary">Battery Saver Exemption</h3>
                  <button
                    type="button"
                    onClick={requestBatteryExemptionNative}
                    className="text-2xs font-bold text-accent hover:underline"
                  >
                    Set Unrestricted →
                  </button>
                </div>
                <p className="text-2xs text-content-muted mt-0.5 leading-relaxed">
                  Set battery optimization to &quot;No Restrictions&quot; so Android doesn&apos;t sleep the listener.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            {isNative && (
              <div className="p-3.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-surface-850 flex items-center justify-center text-accent shrink-0 font-bold text-xs border border-surface-700">
                  3
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-content-primary">Background Autostart</h3>
                    <button
                      type="button"
                      onClick={openAutostartSettingsNative}
                      className="text-2xs font-bold text-accent hover:underline"
                    >
                      Enable Autostart →
                    </button>
                  </div>
                  <p className="text-2xs text-content-muted mt-0.5 leading-relaxed">
                    Required on Xiaomi, Oppo, Vivo, OnePlus, and Huawei devices to capture messages after restarts.
                  </p>
                </div>
              </div>
            )}

            {/* Step 4 */}
            <div className="p-3.5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-surface-850 flex items-center justify-center text-accent shrink-0 font-bold text-xs border border-surface-700">
                4
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-bold text-content-primary">Lock App in Recent Tasks</h3>
                <p className="text-2xs text-content-muted mt-0.5 leading-relaxed">
                  Open Android&apos;s Recent Apps switcher, swipe down on NotiCatch (or tap the padlock icon) so system task cleaners don&apos;t close it.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Security & Access */}
        <section className="px-4 pt-4 pb-3">
          <h2 className="text-2xs font-bold text-content-secondary uppercase tracking-widest mb-2.5 px-1">
            Security & Authentication
          </h2>
          <div className="card overflow-hidden shadow-card">
            <SettingsRow
              icon={<Shield className="w-4 h-4 text-accent" />}
              label="Biometric / PIN Gate"
              description="Requires device fingerprint or PIN to unlock your vault"
              control={
                <ToggleSwitch
                  id="biometric-toggle"
                  checked={settings.biometricEnabled}
                  onChange={val => updateSetting('biometricEnabled', val)}
                />
              }
            />

            <SettingsRow
              icon={<KeyRound className="w-4 h-4 text-rose-700" />}
              label="Decoy Emergency PIN"
              description="Entering this decoy code silently wipes your data if coerced"
              onClick={() => setActiveModal('duress-pin')}
            />

            <SettingsRow
              icon={<Lock className="w-4 h-4 text-accent" />}
              label="Screen Privacy Shield"
              description="Hides content in the recent apps switcher and blocks screenshots"
              control={
                <ToggleSwitch
                  id="screen-secure-toggle"
                  checked={settings.screenSecureEnabled}
                  onChange={val => updateSetting('screenSecureEnabled', val)}
                />
              }
            />

            <SettingsRow
              icon={<Clock className="w-4 h-4 text-accent" />}
              label="Auto-Lock Timeout"
              description={`Locks the vault after ${currentTimeoutLabel} of inactivity`}
              onClick={() => setShowTimeoutPicker(v => !v)}
              control={
                <span className="text-xs font-bold text-accent flex items-center gap-1">
                  {currentTimeoutLabel}
                  <ChevronDown className="w-3.5 h-3.5" />
                </span>
              }
            />

            {showTimeoutPicker && (
              <div className="bg-surface-850 p-2.5 border-t border-surface-700 flex flex-wrap gap-1.5 animate-slide-up">
                {timeoutOptions.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      updateSetting('sessionTimeoutSeconds', option.value);
                      setShowTimeoutPicker(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      settings.sessionTimeoutSeconds === option.value
                        ? 'bg-accent text-white shadow-warm-sm'
                        : 'bg-surface-900 text-content-primary hover:bg-surface-750 border border-surface-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Message Preferences */}
        <section className="px-4 pt-4 pb-3">
          <h2 className="text-2xs font-bold text-content-secondary uppercase tracking-widest mb-2.5 px-1">
            Message Preferences
          </h2>
          <div className="card overflow-hidden shadow-card">
            <SettingsRow
              icon={<Filter className="w-4 h-4 text-accent" />}
              label="Spam & OTP Suppression"
              description="Automatically ignores verification codes & automated broadcasts"
              control={
                <ToggleSwitch
                  id="spam-filter-toggle"
                  checked={settings.spamFilterEnabled}
                  onChange={val => updateSetting('spamFilterEnabled', val)}
                />
              }
            />
          </div>
        </section>

        {/* Data & Privacy Documents */}
        <section className="px-4 pt-4 pb-3">
          <h2 className="text-2xs font-bold text-content-secondary uppercase tracking-widest mb-2.5 px-1">
            Data & Privacy Documents
          </h2>
          <div className="card overflow-hidden shadow-card">
            <SettingsRow
              icon={<Download className="w-4 h-4 text-accent" />}
              label="Export Chat History"
              description="Save chats to a printable PDF dossier or CSV spreadsheet"
              onClick={openExportModal}
            />

            <SettingsRow
              icon={<FileCheck2 className="w-4 h-4 text-accent" />}
              label="Privacy Policy"
              description="Review our 100% offline, zero-network privacy architecture"
              onClick={() => setActiveLegalDoc(PRIVACY_POLICY)}
            />

            <SettingsRow
              icon={<FileText className="w-4 h-4 text-accent" />}
              label="Terms of Service"
              description="Terms of personal usage and device notification permissions"
              onClick={() => setActiveLegalDoc(TERMS_OF_SERVICE)}
            />

            <SettingsRow
              icon={<Shield className="w-4 h-4 text-accent" />}
              label="Application Version"
              description="NotiCatch Private Notification Vault"
              value="v1.6.2"
            />

            <SettingsRow
              icon={<Trash2 className="w-4 h-4 text-rose-700" />}
              label="Wipe All Data"
              description="Permanently erase all captured messages and reset vault"
              danger
              onClick={() => setActiveModal('wipe')}
            />
          </div>
        </section>

        {/* Session Actions */}
        <section className="px-4 pt-4 pb-6">
          <div className="card overflow-hidden shadow-card">
            <SettingsRow
              icon={<LogOut className="w-4 h-4 text-content-secondary" />}
              label="Lock Vault"
              description="Instantly locks the vault until next biometric or PIN authentication"
              onClick={() => setActiveModal('logout')}
            />
          </div>
        </section>

      </div>

      {/* Duress Emergency PIN Modal */}
      {activeModal === 'duress-pin' && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-sm bg-surface-900 rounded-3xl p-6 shadow-card-lg border border-surface-700 animate-slide-up flex flex-col items-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between mb-4 pb-2 border-b border-surface-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-700">
                  <KeyRound className="w-4 h-4" />
                </div>
                <span className="font-serif text-base font-bold text-content-primary">Decoy Emergency PIN</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setDuressInput('');
                }}
                className="w-7 h-7 rounded-full bg-surface-850 flex items-center justify-center text-content-muted hover:text-content-primary"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-content-muted text-center mb-4 leading-relaxed font-medium">
              If forced to unlock under physical coercion, entering this 4-digit decoy code will silently and instantly wipe the entire database.
            </p>

            <input
              type="password"
              maxLength={4}
              value={duressInput}
              onChange={e => setDuressInput(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Enter 4-digit Decoy PIN"
              className="w-full text-center text-xl font-bold tracking-widest py-3 px-4 rounded-xl border border-surface-700 bg-surface-850 mb-4 focus:border-accent"
            />

            {duressSuccess && (
              <span className="text-xs text-accent font-bold mb-3">{duressSuccess}</span>
            )}

            <button
              type="button"
              onClick={handleSaveDuressPin}
              disabled={duressInput.length !== 4}
              className="btn-neu-primary w-full py-3 text-sm font-bold disabled:opacity-50"
            >
              Save Decoy PIN
            </button>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {activeModal === 'export' && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 animate-fade-in"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-sm bg-surface-900 rounded-3xl p-5 shadow-card-lg border border-surface-700 animate-slide-up flex flex-col max-h-[80vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-surface-700 mb-3">
              <span className="font-serif text-base font-bold text-content-primary">Export Chat History</span>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-7 h-7 rounded-full bg-surface-850 flex items-center justify-center text-content-muted hover:text-content-primary"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {exportSuccessMsg && (
              <div className="mb-3 p-2 rounded-xl bg-accent-muted text-accent text-xs font-bold text-center animate-fade-in">
                {exportSuccessMsg}
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 py-1">
              {conversations.length === 0 ? (
                <span className="text-xs text-content-muted text-center block py-4">
                  No conversations available to export.
                </span>
              ) : (
                conversations.map(c => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl bg-surface-850 border border-surface-700 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-content-primary truncate block">
                        {c.chatTitle}
                      </span>
                      <span className="text-2xs text-content-muted block">
                        {c.deletedCount} deleted
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        disabled={exportingChatId === c.id}
                        onClick={() => handleExportPDF(c.id, c.chatTitle)}
                        className="p-2 rounded-lg bg-surface-900 border border-surface-700 text-accent hover:bg-accent hover:text-white transition-colors text-2xs font-bold flex items-center gap-1 shadow-xs"
                      >
                        <FileText className="w-3 h-3" />
                        <span>PDF</span>
                      </button>
                      <button
                        type="button"
                        disabled={exportingChatId === c.id}
                        onClick={() => handleExportCSV(c.id, c.chatTitle)}
                        className="p-2 rounded-lg bg-surface-900 border border-surface-700 text-accent hover:bg-accent hover:text-white transition-colors text-2xs font-bold flex items-center gap-1 shadow-xs"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>CSV</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Legal Document Viewer Modal */}
      <LegalDocumentModal
        isOpen={activeLegalDoc !== null}
        document={activeLegalDoc}
        onClose={() => setActiveLegalDoc(null)}
      />

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={activeModal === 'logout'}
        title="Lock Vault?"
        description="Your messages will remain safe on your device. You will need your biometric fingerprint or PIN to unlock."
        confirmLabel="Lock Vault"
        confirmVariant="primary"
        onConfirm={handleLogoutConfirm}
        onCancel={() => setActiveModal(null)}
      />

      <ConfirmationModal
        isOpen={activeModal === 'wipe'}
        title="Permanently Wipe All Data?"
        description="This will permanently delete all captured messages and conversations from local device storage. This action cannot be undone."
        confirmLabel="Wipe Database"
        confirmVariant="danger"
        isLoading={isWiping}
        onConfirm={handleWipeConfirm}
        onCancel={() => setActiveModal(null)}
      />
    </div>
  );
}
