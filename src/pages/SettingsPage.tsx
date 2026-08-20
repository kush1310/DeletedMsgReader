/**
 * SettingsPage.tsx
 *
 * System Settings Hub for NotiCatch.
 * Styled to precisely match Anthropic Claude's mobile Settings screen (Screenshots 1 & 3).
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Info,
  User,
  CreditCard,
  Sliders,
  Cable,
  Smartphone,
  Moon,
  Type,
  Mic,
  Vibrate,
  Bell,
  Clock,
  Shield,
  Share2,
  LogOut,
  ChevronRight,
  Download,
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
import { SideNavigationDrawer } from '@/components/navigation';
import {
  loadAppSettings,
  saveAppSettings,
  exportChatAsPDFNative,
  exportChatAsCSVNative,
  executePanicWipe,
} from '@/services/NativeBridgeService';
import { PRIVACY_POLICY, TERMS_OF_SERVICE, type LegalDocument } from '@/data/legalContent';
import type { AppSettings } from '@/types';

export function SettingsPage() {
  const navigate = useNavigate();

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

  const [isDrawerOpen,        setIsDrawerOpen]        = useState(false);
  const [showColorModal,      setShowColorModal]      = useState(false);
  const [showFontModal,       setShowFontModal]       = useState(false);
  const [showTimeModal,       setShowTimeModal]       = useState(false);
  const [showExportModal,     setShowExportModal]     = useState(false);
  const [showLogoutModal,     setShowLogoutModal]     = useState(false);
  const [showWipeModal,       setShowWipeModal]       = useState(false);
  const [activeLegalDoc,      setActiveLegalDoc]      = useState<LegalDocument | null>(null);
  const [isProcessing,        setIsProcessing]        = useState(false);
  const [hapticsActive,       setHapticsActive]       = useState(
    () => localStorage.getItem('noticatch_haptics') !== 'false'
  );

  useEffect(() => {
    loadAppSettings().then(setSettings);
  }, []);

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

  function handleLogout(): void {
    sessionStorage.removeItem('session_start');
    sessionStorage.removeItem('session_last_active');
    navigate('/login', { replace: true });
  }

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

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF9F5] text-content-primary">
      {/* Top App Bar matching Screenshot 1 & 3 */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-[#FAF9F5]/90 backdrop-blur-md border-b border-[#E8E4D8] pt-safe">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            type="button"
            id="settings-hamburger-button"
            onClick={() => setIsDrawerOpen(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-content-primary hover:bg-surface-850 transition-colors"
          >
            <Menu className="w-5 h-5" strokeWidth={2} />
          </button>
          <h1 className="font-serif text-lg font-bold text-content-primary tracking-tight">
            Settings
          </h1>
          <button
            type="button"
            id="settings-info-button"
            onClick={() => setActiveLegalDoc(PRIVACY_POLICY)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-content-primary hover:bg-surface-850 transition-colors"
          >
            <Info className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* Main Settings List */}
      <main className="flex-1 pt-18 pb-24 px-4 max-w-lg mx-auto w-full space-y-3.5 animate-slide-up">

        {/* Card 1: Account Header Card */}
        <div className="card bg-white rounded-3xl p-4 shadow-card border border-[#E8E4D8] flex items-center justify-between">
          <span className="text-sm font-bold text-content-primary truncate">
            kushshah900@gmail.com
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-black text-white text-xs font-bold shrink-0">
            Free
          </span>
        </div>

        {/* Card 2: Upgrade Promo Banner Card */}
        <div className="card bg-white rounded-3xl p-5 shadow-card border border-[#E8E4D8] space-y-2">
          <h2 className="text-base font-bold text-content-primary">
            Want more Claude?
          </h2>
          <p className="text-xs text-content-muted leading-relaxed font-medium pb-1">
            Upgrade for more usage and capabilities.
          </p>
          <button
            type="button"
            id="upgrade-button"
            onClick={() => setActiveLegalDoc(TERMS_OF_SERVICE)}
            className="px-5 py-2 rounded-full bg-black text-white text-xs font-bold hover:bg-neutral-800 transition-colors shadow-xs"
          >
            Upgrade
          </button>
        </div>

        {/* Card 3: Profile & Billing */}
        <div className="card bg-white rounded-3xl overflow-hidden shadow-card border border-[#E8E4D8] divide-y divide-surface-700">
          <button
            type="button"
            id="settings-profile-row"
            onClick={() => navigate('/settings/profile')}
            className="w-full flex items-center justify-between p-4 hover:bg-surface-850 transition-colors text-left"
          >
            <div className="flex items-center gap-3.5">
              <User className="w-5 h-5 text-content-secondary" strokeWidth={2} />
              <span className="text-sm font-semibold text-content-primary">Profile</span>
            </div>
            <ChevronRight className="w-4 h-4 text-content-muted" />
          </button>

          <button
            type="button"
            id="settings-billing-row"
            onClick={() => navigate('/settings/profile')}
            className="w-full flex items-center justify-between p-4 hover:bg-surface-850 transition-colors text-left"
          >
            <div className="flex items-center gap-3.5">
              <CreditCard className="w-5 h-5 text-content-secondary" strokeWidth={2} />
              <span className="text-sm font-semibold text-content-primary">Billing</span>
            </div>
            <ChevronRight className="w-4 h-4 text-content-muted" />
          </button>
        </div>

        {/* Card 4: Capabilities, Connectors, Permissions */}
        <div className="card bg-white rounded-3xl overflow-hidden shadow-card border border-[#E8E4D8] divide-y divide-surface-700">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3.5">
              <Sliders className="w-5 h-5 text-content-secondary" strokeWidth={2} />
              <div>
                <span className="text-sm font-semibold text-content-primary block">Capabilities</span>
                <span className="text-xs text-content-muted font-medium">4 enabled</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3.5">
              <Cable className="w-5 h-5 text-content-secondary" strokeWidth={2} />
              <span className="text-sm font-semibold text-content-primary">Connectors</span>
            </div>
          </div>

          <button
            type="button"
            id="settings-permissions-row"
            onClick={() => navigate('/settings/permissions')}
            className="w-full flex items-center justify-between p-4 hover:bg-surface-850 transition-colors text-left"
          >
            <div className="flex items-center gap-3.5">
              <Smartphone className="w-5 h-5 text-content-secondary" strokeWidth={2} />
              <span className="text-sm font-semibold text-content-primary">Permissions</span>
            </div>
            <ChevronRight className="w-4 h-4 text-content-muted" />
          </button>
        </div>

        {/* Card 5: Color mode, Font style, Voice */}
        <div className="card bg-white rounded-3xl overflow-hidden shadow-card border border-[#E8E4D8] divide-y divide-surface-700">
          <button
            type="button"
            id="settings-color-mode-row"
            onClick={() => setShowColorModal(true)}
            className="w-full flex items-center justify-between p-4 hover:bg-surface-850 transition-colors text-left"
          >
            <div className="flex items-center gap-3.5">
              <Moon className="w-5 h-5 text-content-secondary" strokeWidth={2} />
              <div>
                <span className="text-sm font-semibold text-content-primary block">Color mode</span>
                <span className="text-xs text-content-muted capitalize font-medium">{settings.colorMode || 'System'}</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-content-muted" />
          </button>

          <button
            type="button"
            id="settings-font-style-row"
            onClick={() => setShowFontModal(true)}
            className="w-full flex items-center justify-between p-4 hover:bg-surface-850 transition-colors text-left"
          >
            <div className="flex items-center gap-3.5">
              <Type className="w-5 h-5 text-content-secondary" strokeWidth={2} />
              <div>
                <span className="text-sm font-semibold text-content-primary block">Font style</span>
                <span className="text-xs text-content-muted capitalize font-medium">{settings.fontStyle || 'Default'}</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-content-muted" />
          </button>

          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3.5">
              <Mic className="w-5 h-5 text-content-secondary" strokeWidth={2} />
              <span className="text-sm font-semibold text-content-primary">Voice</span>
            </div>
          </div>
        </div>

        {/* Card 6: Haptic feedback, Notifications, Time & focus, Privacy, Sharing */}
        <div className="card bg-white rounded-3xl overflow-hidden shadow-card border border-[#E8E4D8] divide-y divide-surface-700">
          {/* Haptic feedback */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3.5">
              <Vibrate className="w-5 h-5 text-content-secondary" strokeWidth={2} />
              <span className="text-sm font-semibold text-content-primary">Haptic feedback</span>
            </div>
            <ToggleSwitch
              id="toggle-haptics"
              checked={hapticsActive}
              onChange={handleToggleHaptics}
            />
          </div>

          {/* Notifications */}
          <button
            type="button"
            id="settings-notifications-row"
            onClick={() => navigate('/settings/notifications')}
            className="w-full flex items-center justify-between p-4 hover:bg-surface-850 transition-colors text-left"
          >
            <div className="flex items-center gap-3.5">
              <Bell className="w-5 h-5 text-content-secondary" strokeWidth={2} />
              <span className="text-sm font-semibold text-content-primary">Notifications</span>
            </div>
            <ChevronRight className="w-4 h-4 text-content-muted" />
          </button>

          {/* Time & focus (Inactivity Auto-Lock) */}
          <button
            type="button"
            id="settings-time-focus-row"
            onClick={() => setShowTimeModal(true)}
            className="w-full flex items-center justify-between p-4 hover:bg-surface-850 transition-colors text-left"
          >
            <div className="flex items-center gap-3.5">
              <Clock className="w-5 h-5 text-content-secondary" strokeWidth={2} />
              <div>
                <span className="text-sm font-semibold text-content-primary block">Time & focus</span>
                <span className="text-xs text-content-muted font-medium">
                  Auto-lock after {timeoutLabels[settings.sessionTimeoutSeconds] || '5 minutes'}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-content-muted" />
          </button>

          {/* Privacy */}
          <button
            type="button"
            id="settings-privacy-row"
            onClick={() => navigate('/settings/privacy')}
            className="w-full flex items-center justify-between p-4 hover:bg-surface-850 transition-colors text-left"
          >
            <div className="flex items-center gap-3.5">
              <Shield className="w-5 h-5 text-content-secondary" strokeWidth={2} />
              <span className="text-sm font-semibold text-content-primary">Privacy</span>
            </div>
            <ChevronRight className="w-4 h-4 text-content-muted" />
          </button>

          {/* Sharing / Export */}
          <button
            type="button"
            id="settings-sharing-row"
            onClick={() => setShowExportModal(true)}
            className="w-full flex items-center justify-between p-4 hover:bg-surface-850 transition-colors text-left"
          >
            <div className="flex items-center gap-3.5">
              <Share2 className="w-5 h-5 text-content-secondary" strokeWidth={2} />
              <span className="text-sm font-semibold text-content-primary">Sharing & Export</span>
            </div>
            <ChevronRight className="w-4 h-4 text-content-muted" />
          </button>
        </div>

        {/* Log Out Action */}
        <div className="pt-2">
          <button
            type="button"
            id="settings-logout-button"
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center gap-3.5 px-4 py-3 text-left text-rose-700 hover:text-rose-800 transition-colors"
          >
            <LogOut className="w-5 h-5 text-rose-700" strokeWidth={2} />
            <span className="text-sm font-semibold">Log out</span>
          </button>
        </div>
      </main>

      {/* Side Navigation Drawer */}
      <SideNavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      {/* Color Mode Modal */}
      <ColorModeModal
        isOpen={showColorModal}
        currentMode={(settings.colorMode as ColorMode) || 'system'}
        onSelect={mode => updateSetting('colorMode', mode)}
        onClose={() => setShowColorModal(false)}
      />

      {/* Font Style Modal */}
      <FontStyleModal
        isOpen={showFontModal}
        currentStyle={(settings.fontStyle as FontStyle) || 'default'}
        onSelect={style => updateSetting('fontStyle', style)}
        onClose={() => setShowFontModal(false)}
      />

      {/* Time & Focus (Auto-Lock Timeout) Dialog Modal */}
      {showTimeModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-6 animate-fade-in"
          onClick={() => setShowTimeModal(false)}
        >
          <div
            className="w-full max-w-xs bg-white rounded-3xl p-5 shadow-card-lg border border-surface-700 animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-content-primary mb-4 px-1">
              Time & focus (Auto-lock)
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
                      ? 'bg-surface-850 text-accent font-bold'
                      : 'text-content-primary hover:bg-surface-850'
                  }`}
                >
                  <span>{opt.label}</span>
                  {settings.sessionTimeoutSeconds === opt.seconds && <span>✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Export Selection Modal */}
      {showExportModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-6 animate-fade-in"
          onClick={() => setShowExportModal(false)}
        >
          <div
            className="w-full max-w-xs bg-white rounded-3xl p-5 shadow-card-lg border border-surface-700 animate-scale-in space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-content-primary px-1">
              Export Chat History
            </h3>
            <p className="text-xs text-content-muted px-1 font-medium">
              Save all captured conversations to your device storage.
            </p>
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={async () => {
                  setShowExportModal(false);
                  await exportChatAsPDFNative('all');
                }}
                className="w-full py-3 px-4 rounded-2xl bg-surface-850 hover:bg-surface-700 text-content-primary font-semibold text-xs flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-accent" />
                <span>Export as PDF Dossier</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowExportModal(false);
                  await exportChatAsCSVNative('all');
                }}
                className="w-full py-3 px-4 rounded-2xl bg-surface-850 hover:bg-surface-700 text-content-primary font-semibold text-xs flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-accent" />
                <span>Export as CSV Spreadsheet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        isOpen={showLogoutModal}
        title="Lock Vault"
        description="Are you sure you want to lock the vault? Biometric or PIN authentication will be required upon return."
        confirmLabel="Lock Vault"
        cancelLabel="Cancel"
        confirmVariant="primary"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />

      {/* Permanent Wipe Confirmation Modal */}
      <ConfirmationModal
        isOpen={showWipeModal}
        title="Permanent Wipe"
        description="This will permanently delete all stored messages and encryption keys. This action cannot be reversed."
        confirmLabel="Wipe Everything"
        cancelLabel="Cancel"
        confirmVariant="danger"
        isLoading={isProcessing}
        onConfirm={handlePermanentWipe}
        onCancel={() => setShowWipeModal(false)}
      />

      {/* Legal Document Viewer Modal */}
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
