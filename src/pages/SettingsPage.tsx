/**
 * SettingsPage
 *
 * Security and configuration control panel for NotiCatch.
 * All actions are fully implemented:
 *   - Biometric / screen security toggles with native persistence
 *   - Session timeout selector with active enforcement
 *   - Spam & OTP filter with native bridge sync
 *   - Export per-chat CSV (conversation picker → CSV download)
 *   - Wipe All Data (typed "WIPE" confirmation required)
 *   - Lock and Logout (confirmation modal required)
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Fingerprint,
  Shield,
  Clock,
  Filter,
  Trash2,
  Download,
  MessageSquare,
  HelpCircle,
  LogOut,
  ChevronDown,
  CheckSquare,
  Square,
} from 'lucide-react';
import { TopAppBar } from '@/components/navigation';
import { SettingsRow, ToggleSwitch, LoadingSpinner, ConfirmationModal } from '@/components/common';
import {
  loadAppSettings,
  persistAppSettings,
  persistAuthState,
  loadAuthState,
  wipeAllData,
  exportChatAsCSV,
  getConversations,
  getMessages,
  setSpamFilterNative,
} from '@/services/NativeBridgeService';
import type { AppSettings, Conversation, Message } from '@/types';

const DEFAULT_SETTINGS: AppSettings = {
  sessionTimeoutSeconds:  300,
  biometricEnabled:       true,
  pinEnabled:             false,
  screenSecureEnabled:    true,
  autoDeleteAfterDays:    null,
  notificationEnabled:    true,
  captureMediaEnabled:    false,
  spamFilterEnabled:      true,
};

type ModalType = 'logout' | 'wipe' | 'export' | null;

/**
 * SettingsPage
 *
 * Renders the Settings control panel with all operations fully wired to
 * NativeBridgeService and local state.
 */
export function SettingsPage() {
  const navigate = useNavigate();

  const [settings,          setSettings]          = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading,         setIsLoading]          = useState(true);
  const [showTimeoutPicker, setShowTimeoutPicker]  = useState(false);
  const [activeModal,       setActiveModal]        = useState<ModalType>(null);
  const [conversations,     setConversations]      = useState<Conversation[]>([]);
  const [selectedChatIds,   setSelectedChatIds]    = useState<Set<string>>(new Set());
  const [isExporting,       setIsExporting]        = useState(false);
  const [isWiping,          setIsWiping]           = useState(false);
  const [exportDone,        setExportDone]         = useState(false);

  useEffect(() => {
    async function loadSettings(): Promise<void> {
      const loaded = await loadAppSettings();
      setSettings(loaded);
      setIsLoading(false);
    }
    loadSettings();
  }, []);

  /**
   * updateSetting
   *
   * Updates a single AppSettings field, persists to storage, and for
   * spamFilterEnabled pushes the value to the native bridge immediately.
   *
   * @param  key    - AppSettings field name to update.
   * @param  value  - New value for the field.
   */
  const updateSetting = useCallback(async <K extends keyof AppSettings>(
    key:   K,
    value: AppSettings[K],
  ): Promise<void> => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await persistAppSettings(updated);
    if (key === 'spamFilterEnabled') {
      await setSpamFilterNative(value as boolean);
    }
  }, [settings]);

  /**
   * handleLogoutConfirm
   *
   * Clears session authentication state and navigates to the login screen.
   * Called only after user confirms in the logout confirmation modal.
   *
   * @redirects - /login on completion.
   */
  async function handleLogoutConfirm(): Promise<void> {
    setActiveModal(null);
    const currentState = await loadAuthState();
    await persistAuthState({
      ...currentState,
      isAuthenticated:  false,
      sessionStartedAt: null,
    });
    sessionStorage.removeItem('session_start');
    navigate('/login', { replace: true });
  }

  /**
   * handleWipeConfirm
   *
   * Permanently deletes all captured messages and conversations.
   * Called only after user types "WIPE" in the destructive confirmation modal.
   *
   * @redirects - /setup on completion to re-run onboarding.
   */
  async function handleWipeConfirm(): Promise<void> {
    setActiveModal(null);
    setIsWiping(true);
    await wipeAllData();
    setIsWiping(false);
    sessionStorage.removeItem('session_start');
    navigate('/setup', { replace: true });
  }

  /**
   * openExportModal
   *
   * Loads the list of captured conversations for the export picker modal.
   */
  async function openExportModal(): Promise<void> {
    const loaded = await getConversations();
    setConversations(loaded);
    setSelectedChatIds(new Set());
    setExportDone(false);
    setActiveModal('export');
  }

  /**
   * handleExportSelected
   *
   * Exports all selected conversations as individual CSV files.
   * Each conversation produces one CSV download with all captured messages.
   *
   * @validates - At least one conversation must be selected.
   */
  async function handleExportSelected(): Promise<void> {
    if (selectedChatIds.size === 0) return;
    setIsExporting(true);

    for (const conversationId of selectedChatIds) {
      const conversation = conversations.find(c => c.id === conversationId);
      if (!conversation) continue;
      const messages: Message[] = await getMessages(conversationId);
      await exportChatAsCSV(conversationId, conversation.chatTitle, messages);
    }

    setIsExporting(false);
    setExportDone(true);
    setTimeout(() => setActiveModal(null), 1200);
  }

  function toggleChatSelection(conversationId: string): void {
    setSelectedChatIds(prev => {
      const next = new Set(prev);
      if (next.has(conversationId)) {
        next.delete(conversationId);
      } else {
        next.add(conversationId);
      }
      return next;
    });
  }

  const timeoutOptions: Array<{ label: string; value: number }> = [
    { label: '1 minute',   value: 60   },
    { label: '5 minutes',  value: 300  },
    { label: '15 minutes', value: 900  },
    { label: '30 minutes', value: 1800 },
    { label: 'Never',      value: 0    },
  ];

  const currentTimeoutLabel =
    timeoutOptions.find(opt => opt.value === settings.sessionTimeoutSeconds)?.label ?? '5 minutes';

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-surface-800">
        <TopAppBar title="Settings" />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface-800">
      <TopAppBar title="Settings" subtitle="Security and privacy controls" />

      <div className="flex-1 overflow-y-auto pt-14 pb-20">

        {/* Security Section */}
        <section className="px-4 pt-5 pb-2">
          <h2 className="text-xs font-bold text-content-secondary uppercase tracking-widest mb-2.5 px-1">
            Security & Access
          </h2>
          <div className="space-y-2">

            <div className="card-interactive flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-lg bg-surface-800 flex items-center justify-center text-accent flex-shrink-0">
                <Fingerprint className="w-5 h-5 text-accent" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-content-primary">Biometric Lock</p>
                <p className="text-xs text-content-muted mt-0.5 font-medium">Require fingerprint or face to unlock</p>
              </div>
              <ToggleSwitch
                id="biometric-toggle"
                label="Biometric lock"
                checked={settings.biometricEnabled}
                onChange={checked => updateSetting('biometricEnabled', checked)}
              />
            </div>

            <div className="card-interactive flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-lg bg-surface-800 flex items-center justify-center text-accent flex-shrink-0">
                <Shield className="w-5 h-5 text-accent" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-content-primary">Screen Protection</p>
                <p className="text-xs text-content-muted mt-0.5 font-medium">Block screenshots and task switcher previews</p>
              </div>
              <ToggleSwitch
                id="screen-secure-toggle"
                label="Screen protection"
                checked={settings.screenSecureEnabled}
                onChange={checked => updateSetting('screenSecureEnabled', checked)}
              />
            </div>

            <div className="card">
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
                  <p className="text-xs text-content-muted mt-0.5 font-medium">Auto-lock after inactivity</p>
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
                      onClick={() => { updateSetting('sessionTimeoutSeconds', option.value); setShowTimeoutPicker(false); }}
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
                <p className="text-xs text-content-muted mt-0.5 font-medium">Suppress one-time verification codes and automated spam</p>
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
              description="Download captured messages as CSV files, one per conversation"
              onClick={openExportModal}
            />
            <SettingsRow
              id="wipe-data-button"
              icon={<Trash2 className="w-5 h-5 text-red-600" strokeWidth={2} />}
              label="Wipe All Data"
              description="Permanently delete all captured messages and reset to setup"
              onClick={() => setActiveModal('wipe')}
              danger
            />
          </div>
        </section>

        {/* Support */}
        <section className="px-4 pt-5 pb-2">
          <h2 className="text-xs font-bold text-content-secondary uppercase tracking-widest mb-2.5 px-1">
            Support & Diagnostics
          </h2>
          <div className="space-y-2">
            <SettingsRow
              id="contact-us-button"
              icon={<MessageSquare className="w-5 h-5 text-accent" strokeWidth={2} />}
              label="Contact Us"
              description="Get help from the NotiCatch developer team"
              onClick={() => navigate('/contact')}
            />
            <SettingsRow
              id="feedback-button"
              icon={<HelpCircle className="w-5 h-5 text-accent" strokeWidth={2} />}
              label="Feedback & Diagnostics"
              description="Report issues and inspect local notification logs"
              onClick={() => navigate('/feedback')}
            />
          </div>
        </section>

        {/* Lock & Logout */}
        <section className="px-4 pt-5 pb-8">
          <button
            id="logout-button"
            type="button"
            onClick={() => setActiveModal('logout')}
            className="btn-danger w-full"
          >
            {isWiping ? <LoadingSpinner size="sm" /> : <LogOut className="w-4 h-4" strokeWidth={2.2} />}
            Lock and Sign Out
          </button>
          <p className="text-2xs text-content-muted text-center mt-3 font-medium">
            NotiCatch v1.0.0 — Zero network permission. 100% on-device storage.
          </p>
        </section>
      </div>

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        isOpen={activeModal === 'logout'}
        title="Lock and Sign Out"
        body="Your session will be cleared and you will be returned to the lock screen. All captured data remains safely stored on this device."
        confirmLabel="Lock & Sign Out"
        isDangerous={false}
        onConfirm={handleLogoutConfirm}
        onCancel={() => setActiveModal(null)}
      />

      {/* Wipe All Data Confirmation Modal */}
      <ConfirmationModal
        isOpen={activeModal === 'wipe'}
        title="Wipe All Data"
        body="This permanently deletes every captured message, conversation, and audit log from this device. This action cannot be undone."
        confirmLabel="Wipe Everything"
        isDangerous
        requireTypedConfirmation="WIPE"
        onConfirm={handleWipeConfirm}
        onCancel={() => setActiveModal(null)}
      />

      {/* Export Conversation Picker Modal */}
      {activeModal === 'export' && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setActiveModal(null); }}
        >
          <div
            className="w-full max-w-lg bg-white animate-slide-up"
            style={{ borderRadius: '8px 8px 0 0', padding: '24px 20px 32px', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}
          >
            <h2 className="text-base font-bold text-content-primary mb-1">Export Chat Data</h2>
            <p className="text-xs text-content-muted font-medium mb-4">
              Select conversations to export as CSV files. Each conversation becomes a separate file.
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 mb-5">
              {conversations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-content-muted font-semibold">No conversations captured yet.</p>
                  <p className="text-xs text-content-muted mt-1">Receive WhatsApp messages to capture them.</p>
                </div>
              ) : (
                conversations.map(convo => {
                  const selected = selectedChatIds.has(convo.id);
                  return (
                    <button
                      key={convo.id}
                      type="button"
                      onClick={() => toggleChatSelection(convo.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        selected ? 'bg-accent-muted border border-accent/40' : 'bg-surface-800 border border-surface-700 hover:bg-surface-850'
                      }`}
                      style={{ borderRadius: '6px' }}
                    >
                      {selected
                        ? <CheckSquare className="w-4 h-4 text-accent flex-shrink-0" strokeWidth={2} />
                        : <Square     className="w-4 h-4 text-content-muted flex-shrink-0" strokeWidth={2} />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-content-primary truncate">{convo.chatTitle}</p>
                        <p className="text-xs text-content-muted font-medium">
                          {convo.deletedCount} deleted — {convo.isGroup ? 'Group' : 'Direct'}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex-1 py-3 px-4 text-sm font-bold text-content-primary bg-surface-800 border border-surface-600 transition-colors hover:bg-surface-700"
                style={{ borderRadius: '6px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExportSelected}
                disabled={selectedChatIds.size === 0 || isExporting}
                className="flex-1 py-3 px-4 text-sm font-bold text-white bg-accent hover:bg-accent/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ borderRadius: '6px' }}
              >
                {isExporting ? (
                  <><LoadingSpinner size="sm" /> Exporting...</>
                ) : exportDone ? (
                  'Done'
                ) : (
                  `Export ${selectedChatIds.size > 0 ? `(${selectedChatIds.size})` : ''}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
