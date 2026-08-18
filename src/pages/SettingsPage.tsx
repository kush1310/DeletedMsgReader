/**
 * SettingsPage
 *
 * Security and configuration control panel for NotiCatch.
 * All settings are backed by native Android Room SQLite and SharedPreferences:
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

type ModalType = 'logout' | 'wipe' | 'export' | null;

/**
 * SettingsPage
 *
 * Renders the Settings control panel with all security and export features
 * wired directly to native Android Room DB and SharedPreferences.
 *
 * @returns {JSX.Element} - Settings view container.
 * @validates             - Enforces typed confirmation for wipe, validates export parameters.
 * @redirects             - /login on logout, /setup on wipe.
 * @edge-cases            - Handles empty conversation list gracefully during export.
 */
export function SettingsPage() {
  const navigate = useNavigate();

  const [settings,          setSettings]          = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading,         setIsLoading]         = useState(true);
  const [showTimeoutPicker, setShowTimeoutPicker] = useState(false);
  const [activeModal,       setActiveModal]       = useState<ModalType>(null);
  const [conversations,     setConversations]     = useState<Conversation[]>([]);
  const [exportingChatId,   setExportingChatId]   = useState<string | null>(null);
  const [exportSuccessMsg,  setExportSuccessMsg]  = useState<string | null>(null);
  const [isWiping,          setIsWiping]          = useState(false);

  useEffect(() => {
    async function loadInitialSettings(): Promise<void> {
      const loaded = await loadAppSettings();
      setSettings(loaded);
      setIsLoading(false);
    }
    loadInitialSettings();
  }, []);

  /**
   * updateSetting
   *
   * Updates an AppSettings property, persists locally, and pushes native updates.
   *
   * @param  {K} key    - Setting property key.
   * @param  {any} value - Setting value.
   * @returns {Promise<void>}
   * @validates - Ensures correct type mapping for each key.
   * @redirects - N/A.
   * @edge-cases - Propagates screen security and spam filter updates to Android immediately.
   */
  const updateSetting = useCallback(async <K extends keyof AppSettings>(
    key:   K,
    value: AppSettings[K],
  ): Promise<void> => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await persistAppSettings(updated);

    if (key === 'screenSecureEnabled') {
      await setScreenSecureNative(value as boolean);
    } else if (key === 'spamFilterEnabled') {
      await setSpamFilterNative(value as boolean);
    } else if (key === 'sessionTimeoutSeconds') {
      await setSessionTimeoutNative(value as number);
    }
  }, [settings]);

  /**
   * handleLogoutConfirm
   *
   * Clears session authentication tokens and redirects user to the lock screen.
   *
   * @returns {Promise<void>}
   * @validates - Clears active session storage and persistent auth state.
   * @redirects - /login
   * @edge-cases - Preserves underlying Room SQLite database records.
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
   * Permanently wipes Room SQLite database, clear preferences, and routes to setup.
   *
   * @returns {Promise<void>}
   * @validates - Requires exact typed string "WIPE" in confirmation dialog.
   * @redirects - /setup
   * @edge-cases - Erases all SQLite records and cached files irreversibly.
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
   * Loads all conversations from Room SQLite and displays the export dialog.
   *
   * @returns {Promise<void>}
   * @validates - Queries native getConversations().
   * @redirects - N/A.
   * @edge-cases - Sets empty conversation list if no records exist.
   */
  async function openExportModal(): Promise<void> {
    const loaded = await getConversations();
    setConversations(loaded);
    setExportSuccessMsg(null);
    setActiveModal('export');
  }

  /**
   * handleExportPDF
   *
   * Exports an individual chat conversation as a structured PDF document.
   *
   * @param  {string} conversationId - UUID of the target conversation.
   * @param  {string} chatTitle      - Name of the conversation.
   * @returns {Promise<void>}
   * @validates - Validates conversation existence.
   * @redirects - Launches Android native Share/View sheet.
   * @edge-cases - Displays feedback toast on export completion.
   */
  async function handleExportPDF(conversationId: string, chatTitle: string): Promise<void> {
    setExportingChatId(conversationId);
    const result = await exportChatAsPDF(conversationId, chatTitle);
    setExportingChatId(null);
    if (result.filePath) {
      setExportSuccessMsg(`Exported ${result.rowCount} messages to PDF`);
      setTimeout(() => setExportSuccessMsg(null), 3000);
    }
  }

  /**
   * handleExportCSV
   *
   * Exports an individual chat conversation as a CSV spreadsheet.
   *
   * @param  {string} conversationId - UUID of the target conversation.
   * @param  {string} chatTitle      - Name of the conversation.
   * @returns {Promise<void>}
   * @validates - Validates conversation existence.
   * @redirects - N/A.
   * @edge-cases - Displays feedback toast on export completion.
   */
  async function handleExportCSV(conversationId: string, chatTitle: string): Promise<void> {
    setExportingChatId(conversationId);
    const result = await exportChatAsCSV(conversationId, chatTitle);
    setExportingChatId(null);
    if (result.filePath) {
      setExportSuccessMsg(`Exported ${result.rowCount} messages to CSV`);
      setTimeout(() => setExportSuccessMsg(null), 3000);
    }
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

        {/* Security & Access Section */}
        <section className="px-4 pt-5 pb-2">
          <h2 className="text-xs font-bold text-content-secondary uppercase tracking-widest mb-2.5 px-1">
            Security & Access
          </h2>
          <div className="space-y-2">

            {/* Screen Protection with live FLAG_SECURE toggle */}
            <div className="card-interactive flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-lg bg-surface-800 flex items-center justify-center text-accent flex-shrink-0">
                <Shield className="w-5 h-5 text-accent" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-content-primary">Screen Protection</p>
                <p className="text-xs text-content-muted mt-0.5 font-medium">
                  {settings.screenSecureEnabled
                    ? 'Screenshots blocked & previews shielded'
                    : 'Screenshots permitted (FLAG_SECURE disabled)'}
                </p>
              </div>
              <ToggleSwitch
                id="screen-secure-toggle"
                label="Screen protection"
                checked={settings.screenSecureEnabled}
                onChange={checked => updateSetting('screenSecureEnabled', checked)}
              />
            </div>

            {/* Session Timeout Selector */}
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
        body="Your active session will be closed and fingerprint authentication will be required upon next launch. All database records remain safely preserved."
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
        confirmLabel="Wipe Everything"
        isDangerous
        requireTypedConfirmation="WIPE"
        onConfirm={handleWipeConfirm}
        onCancel={() => setActiveModal(null)}
      />

      {/* Export Conversation Picker Modal (Chat-wise PDF / CSV) */}
      {activeModal === 'export' && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setActiveModal(null); }}
        >
          <div
            className="w-full max-w-lg bg-white animate-slide-up"
            style={{ borderRadius: '8px 8px 0 0', padding: '24px 20px 32px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-content-primary">Export Chat Data</h2>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-xs text-content-muted font-bold px-2 py-1 hover:bg-surface-800 rounded"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-content-muted font-medium mb-3">
              Generate formatted PDF documents or CSV archives chat-wise.
            </p>

            {exportSuccessMsg && (
              <div className="mb-3 px-3 py-2 bg-emerald-50 border border-emerald-300 rounded text-xs font-bold text-emerald-800 animate-fade-in">
                {exportSuccessMsg}
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1">
              {conversations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-content-muted font-semibold">No captured conversations found in database.</p>
                  <p className="text-xs text-content-muted mt-1">Receive WhatsApp notifications to begin saving chats.</p>
                </div>
              ) : (
                conversations.map(convo => {
                  const isCurrentExporting = exportingChatId === convo.id;
                  return (
                    <div
                      key={convo.id}
                      className="p-3 bg-surface-800 border border-surface-700 rounded-lg flex flex-col gap-2 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="text-sm font-bold text-content-primary truncate">{convo.chatTitle}</p>
                          <p className="text-2xs text-content-muted font-semibold mt-0.5">
                            {convo.deletedCount} deleted recovered — {convo.isGroup ? 'Group Chat' : 'Direct Message'}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1 border-t border-surface-700/60">
                        {/* PDF Export Button */}
                        <button
                          type="button"
                          disabled={isCurrentExporting}
                          onClick={() => handleExportPDF(convo.id, convo.chatTitle)}
                          className="flex-1 py-2 px-3 text-xs font-bold text-white bg-accent hover:bg-accent/90 rounded flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                        >
                          {isCurrentExporting ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <>
                              <FileText className="w-3.5 h-3.5" />
                              Export PDF
                            </>
                          )}
                        </button>

                        {/* CSV Export Button */}
                        <button
                          type="button"
                          disabled={isCurrentExporting}
                          onClick={() => handleExportCSV(convo.id, convo.chatTitle)}
                          className="py-2 px-3 text-xs font-bold text-content-primary bg-surface-700 hover:bg-surface-600 rounded flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          CSV
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
