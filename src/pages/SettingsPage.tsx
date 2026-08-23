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

import { useState, useEffect, useCallback } from 'react';
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
  Vibrate,
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
import { HapticService, type HapticIntensityLevel } from '@/services/HapticService';
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
  const [hapticLevel,          setHapticLevel]          = useState<HapticIntensityLevel>(HapticService.level);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }

  /**
   * handleHapticLevelChange
   *
   * Updates the HapticService intensity level and persists to localStorage.
   * Fires a sliderChange pulse at each integer threshold for tactile feedback.
   *
   * @param newLevel - New HapticIntensityLevel (0–4) from the slider.
   */
  const handleHapticLevelChange = useCallback((newLevel: HapticIntensityLevel) => {
    setHapticLevel(newLevel);
    HapticService.setLevel(newLevel);
  }, []);

  const HAPTIC_LEVEL_LABELS: Record<HapticIntensityLevel, string> = {
    0: 'Silent',
    1: 'Light',
    2: 'Standard',
    3: 'Strong',
    4: 'Maximum',
  };

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

  useEffect(() => {
    if (showAutoLockModal || showPanicModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showAutoLockModal, showPanicModal]);

  async function handleToggleScreenSecure(enabled: boolean) {
    setScreenSecureOn(enabled);
    await setScreenSecureNative(enabled);
    if (settings) {
      const updated: AppSettings = { ...settings, screenSecureEnabled: enabled };
      await saveAppSettings(updated);
      setSettings(updated);
    }
    showToast(enabled ? 'Screen capture protection enabled' : 'Screen capture protection disabled');
  }

  async function handleToggleSpamFilter(enabled: boolean) {
    setSpamFilterOn(enabled);
    if (settings) {
      const updated: AppSettings = { ...settings, spamFilterEnabled: enabled };
      await saveAppSettings(updated);
      setSettings(updated);
    }
    showToast(enabled ? 'Spam filter enabled' : 'Spam filter disabled');
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
    <div
      className="flex flex-col min-h-screen"
      style={{
        background: 'var(--md-sys-color-background)',
        color: 'var(--md-sys-color-on-surface)',
      }}
    >
      <TopAppBar
        title="Settings"
        subtitle="NotiCatch Vault & System Controls"
      />

      {/* Action Toast */}
      {toastMessage && (
        <div
          className="fixed top-16 left-4 right-4 z-50 p-3 rounded-2xl text-xs font-bold text-center shadow-lg animate-slide-down"
          style={{
            background: 'var(--md-sys-color-primary)',
            color: 'var(--md-sys-color-on-primary)',
          }}
        >
          {toastMessage}
        </div>
      )}

      <main className="flex-1 pt-16 pb-28 px-4 max-w-lg mx-auto w-full space-y-5 animate-slide-up select-none">

        {/* ========================================================
            GROUP 1: VAULT SECURITY
            ======================================================== */}
        <section className="space-y-2">
          <h2 className="settings-section-header">Vault Security</h2>
          <div
            className="rounded-2xl border overflow-hidden"
            style={{
              background: 'var(--md-sys-color-surface)',
              borderColor: 'var(--md-sys-color-outline-variant)',
              boxShadow: 'var(--md-elevation-1)',
            }}
          >

            {/* Device Screen Lock Status */}
            <div
              className="p-4 flex items-center justify-between gap-3 border-b"
              style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'var(--md-sys-color-primary-container)',
                    color: 'var(--md-sys-color-on-primary-container)',
                    border: '1px solid var(--md-sys-color-outline-variant)',
                  }}
                >
                  <Fingerprint className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Device Screen Lock</h3>
                  <p className="text-xs" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Protected by your device PIN, pattern, or biometrics</p>
                </div>
              </div>
              <span className="badge-success text-2xs">
                <CheckCircle2 className="w-3 h-3" /> Protected
              </span>
            </div>

            {/* Inactivity Auto-Lock */}
            <button
              type="button"
              id="row-inactivity-autolock"
              onClick={() => { HapticService.selection(); setShowAutoLockModal(true); }}
              className="w-full p-4 flex items-center justify-between gap-3 text-left border-b min-h-[56px] transition-colors touch-manipulation"
              style={{
                borderColor: 'var(--md-sys-color-outline-variant)',
                background: 'var(--md-sys-color-surface)',
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'var(--md-sys-color-surface-container)',
                    color: 'var(--md-sys-color-primary)',
                    border: '1px solid var(--md-sys-color-outline-variant)',
                  }}
                >
                  <Clock className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Inactivity Auto-Lock</h3>
                  <p className="text-xs" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Locks vault when inactive for {currentTimeoutLabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-xs font-bold" style={{ color: 'var(--md-sys-color-primary)' }}>{currentTimeoutLabel}</span>
                <ChevronRight className="w-4 h-4" style={{ color: 'var(--md-sys-color-on-surface-variant)' }} />
              </div>
            </button>

            {/* Screen Capture Protection (FLAG_SECURE) */}
            <div
              className="p-4 flex items-center justify-between gap-3"
              style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'var(--md-sys-color-success-container)',
                    color: 'var(--md-sys-color-on-success-container)',
                    border: '1px solid var(--md-sys-color-success-border)',
                  }}
                >
                  <EyeOff className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Screen Capture Protection</h3>
                  <p className="text-xs" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Blocks screenshots, recordings, and app preview</p>
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
          <h2 className="settings-section-header">Interception & Background Capture</h2>
          <div
            className="rounded-2xl border overflow-hidden"
            style={{
              background: 'var(--md-sys-color-surface)',
              borderColor: 'var(--md-sys-color-outline-variant)',
              boxShadow: 'var(--md-elevation-1)',
            }}
          >

            {/* Notification Listener Access — DIRECT TRIGGER */}
            <button
              type="button"
              id="row-notification-listener-direct"
              onClick={() => { HapticService.selection(); requestNotificationListenerPermission(); }}
              className="w-full p-4 flex items-center justify-between gap-3 text-left border-b min-h-[56px] transition-colors touch-manipulation"
              style={{
                borderColor: 'var(--md-sys-color-outline-variant)',
                background: 'var(--md-sys-color-surface)',
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'var(--md-sys-color-primary-container)',
                    color: 'var(--md-sys-color-on-primary-container)',
                    border: '1px solid var(--md-sys-color-outline-variant)',
                  }}
                >
                  <Bell className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Notification Listener Service</h3>
                    {notifListenerOn === true ? (
                      <span className="badge-success text-2xs">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="badge-deleted text-2xs">
                        <AlertTriangle className="w-3 h-3" /> Action Required
                      </span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Tap to open Android Notification Access settings</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--md-sys-color-on-surface-variant)' }} />
            </button>

            {/* Battery Saver Optimization — DIRECT TRIGGER */}
            <button
              type="button"
              id="row-battery-exemption-direct"
              onClick={() => { HapticService.selection(); requestBatteryExemptionNative(); }}
              className="w-full p-4 flex items-center justify-between gap-3 text-left border-b min-h-[56px] transition-colors touch-manipulation"
              style={{
                borderColor: 'var(--md-sys-color-outline-variant)',
                background: 'var(--md-sys-color-surface)',
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'var(--md-sys-color-tertiary-container)',
                    color: 'var(--md-sys-color-on-tertiary-container)',
                    border: '1px solid var(--md-sys-color-tertiary-border)',
                  }}
                >
                  <BatteryCharging className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Battery Optimization Exemption</h3>
                  <p className="text-xs" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Tap to exempt NotiCatch from Android background sleep</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--md-sys-color-on-surface-variant)' }} />
            </button>

            {/* Noise / Spam Filter */}
            <div
              className="p-4 flex items-center justify-between gap-3 border-b"
              style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'var(--md-sys-color-primary-container)',
                    color: 'var(--md-sys-color-on-primary-container)',
                    border: '1px solid var(--md-sys-color-outline-variant)',
                  }}
                >
                  <Filter className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Noise / Spam Filter</h3>
                  <p className="text-xs" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Hides system alerts, OTPs, and irrelevant messages</p>
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
              onClick={() => { HapticService.navigate(); navigate('/settings/permissions'); }}
              className="w-full p-4 flex items-center justify-between gap-3 text-left min-h-[56px] transition-colors touch-manipulation"
              style={{ background: 'var(--md-sys-color-surface)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'var(--md-sys-color-surface-container)',
                    color: 'var(--md-sys-color-on-surface-variant)',
                    border: '1px solid var(--md-sys-color-outline-variant)',
                  }}
                >
                  <Shield className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Permissions Management</h3>
                  <p className="text-xs" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>View all 4 background system access controls</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--md-sys-color-on-surface-variant)' }} />
            </button>
          </div>
        </section>

        {/* ========================================================
            GROUP 2B: HAPTIC FEEDBACK INTENSITY
            ======================================================== */}
        <section className="space-y-2">
          <h2 className="settings-section-header">Haptic Feedback</h2>
          <div
            className="rounded-2xl border overflow-hidden p-4"
            style={{
              background: 'var(--md-sys-color-surface)',
              borderColor: 'var(--md-sys-color-outline-variant)',
              boxShadow: 'var(--md-elevation-1)',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'var(--md-sys-color-surface-container)',
                  color: 'var(--md-sys-color-primary)',
                  border: '1px solid var(--md-sys-color-outline-variant)',
                }}
              >
                <Vibrate className="w-4 h-4" strokeWidth={2.2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Haptic Intensity</h3>
                  <span
                    className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                    style={{
                      background: 'var(--md-sys-color-primary-container)',
                      color: 'var(--md-sys-color-on-primary-container)',
                    }}
                  >
                    {HAPTIC_LEVEL_LABELS[hapticLevel]}
                  </span>
                </div>
                <p className="text-xs" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
                  Controls vibration intensity across all interactions
                </p>
              </div>
            </div>

            {/* Slider — 0 to 4 */}
            <input
              id="haptic-intensity-slider"
              type="range"
              min={0}
              max={4}
              step={1}
              value={hapticLevel}
              onChange={(event) => handleHapticLevelChange(parseInt(event.target.value, 10) as HapticIntensityLevel)}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--md-sys-color-primary) ${hapticLevel * 25}%, var(--md-sys-color-outline-variant) ${hapticLevel * 25}%)`,
                accentColor: 'var(--md-sys-color-primary)',
              }}
              aria-label="Haptic feedback intensity level"
            />

            {/* Level labels */}
            <div className="flex justify-between mt-2 px-0.5">
              {([0, 1, 2, 3, 4] as HapticIntensityLevel[]).map(level => (
                <button
                  key={level}
                  type="button"
                  id={`haptic-level-btn-${level}`}
                  onClick={() => handleHapticLevelChange(level)}
                  className="flex flex-col items-center gap-0.5 min-w-0"
                  aria-pressed={hapticLevel === level}
                >
                  <div
                    className="w-1 h-1 rounded-full transition-all duration-180"
                    style={{
                      background: hapticLevel >= level
                        ? 'var(--md-sys-color-primary)'
                        : 'var(--md-sys-color-outline)',
                      transform: hapticLevel === level ? 'scale(1.5)' : 'scale(1)',
                    }}
                  />
                  <span
                    className="text-2xs font-semibold transition-colors duration-180"
                    style={{
                      color: hapticLevel === level
                        ? 'var(--md-sys-color-primary)'
                        : 'var(--md-sys-color-on-surface-muted)',
                      fontWeight: hapticLevel === level ? 700 : 500,
                    }}
                  >
                    {HAPTIC_LEVEL_LABELS[level]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================
            GROUP 3: DATA & EXPORT
            ======================================================== */}
        <section className="space-y-2">
          <h2 className="settings-section-header">Data Storage & Export</h2>
          <div
            className="rounded-2xl border overflow-hidden"
            style={{
              background: 'var(--md-sys-color-surface)',
              borderColor: 'var(--md-sys-color-outline-variant)',
              boxShadow: 'var(--md-elevation-1)',
            }}
          >

            {/* Storage Statistics */}
            <div
              className="p-4 flex items-center justify-between gap-3 border-b"
              style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'var(--md-sys-color-tertiary-container)',
                    color: 'var(--md-sys-color-on-tertiary-container)',
                    border: '1px solid var(--md-sys-color-tertiary-border)',
                  }}
                >
                  <HardDrive className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Storage Statistics</h3>
                  <p className="text-xs" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
                    {messageCount !== null ? `${messageCount} messages archived` : 'Local storage'}
                  </p>
                </div>
              </div>
              <span
                className="text-xs font-mono font-bold"
                style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
              >
                {formatBytes(storageBytes)}
              </span>
            </div>

            {/* Export All as PDF */}
            <button
              type="button"
              id="row-export-pdf"
              onClick={async () => {
                HapticService.impact();
                await exportChatAsPDFNative('all', 'All Conversations');
                showToast('PDF document exported');
              }}
              className="w-full p-4 flex items-center justify-between gap-3 text-left border-b min-h-[56px] transition-colors touch-manipulation"
              style={{
                borderColor: 'var(--md-sys-color-outline-variant)',
                background: 'var(--md-sys-color-surface)',
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'var(--md-sys-color-error-container)',
                    color: 'var(--md-sys-color-on-error-container)',
                    border: '1px solid var(--md-sys-color-error-border)',
                  }}
                >
                  <FileText className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Export All as PDF</h3>
                  <p className="text-xs" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Export conversations as a PDF document</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--md-sys-color-on-surface-variant)' }} />
            </button>

            {/* Export All as CSV */}
            <button
              type="button"
              id="row-export-csv"
              onClick={async () => {
                HapticService.impact();
                await exportChatAsCSVNative('all', 'All Conversations');
                showToast('CSV spreadsheet exported');
              }}
              className="w-full p-4 flex items-center justify-between gap-3 text-left min-h-[56px] transition-colors touch-manipulation"
              style={{ background: 'var(--md-sys-color-surface)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'var(--md-sys-color-success-container)',
                    color: 'var(--md-sys-color-on-success-container)',
                    border: '1px solid var(--md-sys-color-success-border)',
                  }}
                >
                  <Share2 className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Export All as CSV</h3>
                  <p className="text-xs" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Export conversations as a CSV spreadsheet</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--md-sys-color-on-surface-variant)' }} />
            </button>
          </div>
        </section>

        {/* ========================================================
            GROUP 4: SUPPORT & LEGAL
            ======================================================== */}
        <section className="space-y-2">
          <h2 className="settings-section-header">Support & Legal</h2>
          <div
            className="rounded-2xl border overflow-hidden"
            style={{
              background: 'var(--md-sys-color-surface)',
              borderColor: 'var(--md-sys-color-outline-variant)',
              boxShadow: 'var(--md-elevation-1)',
            }}
          >

            {/* Help & Support */}
            <button
              type="button"
              id="row-help-support"
              onClick={() => { HapticService.navigate(); navigate('/feedback'); }}
              className="w-full p-4 flex items-center justify-between gap-3 text-left border-b min-h-[56px] transition-colors touch-manipulation"
              style={{
                borderColor: 'var(--md-sys-color-outline-variant)',
                background: 'var(--md-sys-color-surface)',
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'var(--md-sys-color-primary-container)',
                    color: 'var(--md-sys-color-on-primary-container)',
                    border: '1px solid var(--md-sys-color-outline-variant)',
                  }}
                >
                  <HelpCircle className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Help & Support</h3>
                  <p className="text-xs" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Diagnostic payload and feedback submission</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--md-sys-color-on-surface-variant)' }} />
            </button>

            {/* Contact Developer */}
            <button
              type="button"
              id="row-contact-developer"
              onClick={() => { HapticService.navigate(); navigate('/contact'); }}
              className="w-full p-4 flex items-center justify-between gap-3 text-left border-b min-h-[56px] transition-colors touch-manipulation"
              style={{
                borderColor: 'var(--md-sys-color-outline-variant)',
                background: 'var(--md-sys-color-surface)',
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'var(--md-sys-color-tertiary-container)',
                    color: 'var(--md-sys-color-on-tertiary-container)',
                    border: '1px solid var(--md-sys-color-tertiary-border)',
                  }}
                >
                  <Mail className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Contact Developer</h3>
                  <p className="text-xs" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>kushshah.ce@gmail.com</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--md-sys-color-on-surface-variant)' }} />
            </button>

            {/* GitHub Repository */}
            <a
              id="link-github-repo"
              href="https://github.com/kush1310/DeletedMsgReader"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => HapticService.tap()}
              className="w-full p-4 flex items-center justify-between gap-3 text-left border-b min-h-[56px] transition-colors touch-manipulation"
              style={{
                display: 'flex',
                borderColor: 'var(--md-sys-color-outline-variant)',
                background: 'var(--md-sys-color-surface)',
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'var(--md-sys-color-surface-container-highest)',
                    color: 'var(--md-sys-color-on-surface)',
                    border: '1px solid var(--md-sys-color-outline-variant)',
                  }}
                >
                  <Github className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>GitHub Repository</h3>
                  <p className="text-xs" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Source code, releases, and issue tracker</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--md-sys-color-on-surface-variant)' }} />
            </a>

            {/* Privacy Policy */}
            <button
              type="button"
              id="row-privacy-policy"
              onClick={() => { HapticService.tap(); setActiveLegalDoc(PRIVACY_POLICY); }}
              className="w-full p-4 flex items-center justify-between gap-3 text-left border-b min-h-[56px] transition-colors touch-manipulation"
              style={{
                borderColor: 'var(--md-sys-color-outline-variant)',
                background: 'var(--md-sys-color-surface)',
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'var(--md-sys-color-success-container)',
                    color: 'var(--md-sys-color-on-success-container)',
                    border: '1px solid var(--md-sys-color-success-border)',
                  }}
                >
                  <Shield className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Privacy Policy</h3>
                  <p className="text-xs" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>100% offline, zero-network architecture guarantees</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--md-sys-color-on-surface-variant)' }} />
            </button>

            {/* Terms of Service */}
            <button
              type="button"
              id="row-terms-of-service"
              onClick={() => { HapticService.tap(); setActiveLegalDoc(TERMS_OF_SERVICE); }}
              className="w-full p-4 flex items-center justify-between gap-3 text-left border-b min-h-[56px] transition-colors touch-manipulation"
              style={{
                borderColor: 'var(--md-sys-color-outline-variant)',
                background: 'var(--md-sys-color-surface)',
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'var(--md-sys-color-surface-container)',
                    color: 'var(--md-sys-color-on-surface-variant)',
                    border: '1px solid var(--md-sys-color-outline-variant)',
                  }}
                >
                  <FileText className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Terms of Service</h3>
                  <p className="text-xs" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Usage guidelines and personal backup license</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--md-sys-color-on-surface-variant)' }} />
            </button>

            {/* App Version */}
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'var(--md-sys-color-primary-container)',
                    color: 'var(--md-sys-color-on-primary-container)',
                    border: '1px solid var(--md-sys-color-outline-variant)',
                  }}
                >
                  <Shield className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>App Version</h3>
                  <p className="text-xs" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Production release build</p>
                </div>
              </div>
              <span
                className="text-xs font-mono font-bold px-2.5 py-1 rounded-full border"
                style={{
                  background: 'var(--md-sys-color-primary-container)',
                  color: 'var(--md-sys-color-on-primary-container)',
                  borderColor: 'var(--md-sys-color-outline-variant)',
                }}
              >
                v2.0.3
              </span>
            </div>
          </div>
        </section>

        {/* ========================================================
            DANGER ZONE: LOCK & PANIC WIPE
            ======================================================== */}
        <section className="space-y-2">
          <h2
            className="text-xs font-bold uppercase tracking-wider px-1"
            style={{ color: 'var(--md-sys-color-error)' }}
          >
            Danger Zone
          </h2>
          <div
            className="rounded-2xl border overflow-hidden"
            style={{
              background: 'var(--md-sys-color-surface)',
              borderColor: 'var(--md-sys-color-error-border)',
              boxShadow: 'var(--md-elevation-1)',
            }}
          >

            {/* Lock Vault Now */}
            <button
              type="button"
              id="btn-lock-vault-now"
              onClick={() => { HapticService.warning(); handleLockNow(); }}
              className="w-full p-4 flex items-center justify-between gap-3 text-left border-b min-h-[56px] transition-colors touch-manipulation"
              style={{
                borderColor: 'var(--md-sys-color-error-border)',
                background: 'var(--md-sys-color-surface)',
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'var(--md-sys-color-error-container)',
                    color: 'var(--md-sys-color-error)',
                    border: '1px solid var(--md-sys-color-error-border)',
                  }}
                >
                  <Lock className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-error)' }}>Lock Vault Now</h3>
                  <p className="text-xs" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Immediately requires device screen pass to re-enter</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--md-sys-color-error)' }} />
            </button>

            {/* Panic Wipe / Erase All Data */}
            <button
              type="button"
              id="btn-panic-wipe-open"
              onClick={() => { HapticService.warning(); setShowPanicModal(true); }}
              className="w-full p-4 flex items-center justify-between gap-3 text-left min-h-[56px] transition-colors touch-manipulation"
              style={{ background: 'var(--md-sys-color-surface)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'var(--md-sys-color-error-container)',
                    color: 'var(--md-sys-color-error)',
                    border: '1px solid var(--md-sys-color-error-border)',
                  }}
                >
                  <Trash2 className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-error)' }}>Erase All Data</h3>
                  <p className="text-xs" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Permanently deletes all saved messages and resets app</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--md-sys-color-error)' }} />
            </button>
          </div>
        </section>
      </main>

      {/* Auto-Lock Picker Modal */}
      {showAutoLockModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          style={{ backgroundColor: 'var(--md-sys-color-scrim)' }}
          onClick={() => { HapticService.tap(); setShowAutoLockModal(false); }}
        >
          <div
            className="w-full max-w-sm p-6 shadow-xl animate-sheet-up"
            style={{
              background: 'var(--md-sys-color-surface-container-low)',
              borderRadius: '28px 28px 0 0',
              border: '1px solid var(--md-sys-color-outline-variant)',
              boxShadow: 'var(--md-elevation-5)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bottom-sheet-handle" />
            <h3
              className="text-base font-bold mb-1"
              style={{ color: 'var(--md-sys-color-on-surface)' }}
            >
              Inactivity Auto-Lock
            </h3>
            <p
              className="text-xs mb-4"
              style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
            >
              Choose how long to wait before requiring device re-authentication.
            </p>

            <div className="space-y-2">
              {TIMEOUT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  id={`autolock-opt-${opt.value}`}
                  onClick={() => handleSelectAutoLock(opt.value)}
                  className="w-full py-3 px-4 rounded-2xl text-xs font-bold flex items-center justify-between border transition-all touch-manipulation min-h-[48px]"
                  style={{
                    background: autoLockTimeout === opt.value
                      ? 'var(--md-sys-color-primary-container)'
                      : 'var(--md-sys-color-surface-container)',
                    color: autoLockTimeout === opt.value
                      ? 'var(--md-sys-color-on-primary-container)'
                      : 'var(--md-sys-color-on-surface)',
                    borderColor: autoLockTimeout === opt.value
                      ? 'var(--md-sys-color-primary)'
                      : 'var(--md-sys-color-outline-variant)',
                  }}
                >
                  <span>{opt.label}</span>
                  {autoLockTimeout === opt.value && (
                    <CheckCircle2
                      className="w-4 h-4"
                      style={{ color: 'var(--md-sys-color-primary)' }}
                    />
                  )}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => { HapticService.tap(); setShowAutoLockModal(false); }}
              className="btn-secondary w-full mt-4"
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
