/**
 * SettingsPage
 *
 * Security and configuration control panel for NotiCatch.
 * Allows the user to manage:
 *   - Session timeout duration
 *   - Biometric / PIN authentication settings
 *   - Screen recording protection (FLAG_SECURE)
 *   - Spam filter toggle
 *   - Data export and storage wipe operations
 *   - Navigation to Contact Us and Feedback pages
 */

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { TopAppBar } from '@/components/navigation';
import { SettingsRow, ToggleSwitch, LoadingSpinner } from '@/components/common';
import { loadAppSettings, persistAppSettings } from '@/services/NativeBridgeService';
import type { AppSettings } from '@/types';

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

/**
 * SettingsPage
 *
 * Renders the Settings control panel in Material Design 3 Light Mode.
 */
export function SettingsPage() {
  const navigate = useNavigate();

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [showTimeoutPicker, setShowTimeoutPicker] = useState(false);

  useEffect(() => {
    async function loadSettings(): Promise<void> {
      const loaded = await loadAppSettings();
      setSettings(loaded);
      setIsLoading(false);
    }
    loadSettings();
  }, []);

  async function updateSetting<K extends keyof AppSettings>(
    key:   K,
    value: AppSettings[K],
  ): Promise<void> {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await persistAppSettings(updated);
  }

  function handleLogout(): void {
    navigate('/login');
  }

  const timeoutOptions: Array<{ label: string; value: number }> = [
    { label: '1 minute',   value: 60    },
    { label: '5 minutes',  value: 300   },
    { label: '15 minutes', value: 900   },
    { label: '30 minutes', value: 1800  },
    { label: 'Never',      value: 0     },
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

        {/* === Security Section === */}
        <section className="px-4 pt-5 pb-2">
          <h2 className="text-xs font-bold text-content-secondary uppercase tracking-widest mb-2.5 px-1">
            Security & Access
          </h2>
          <div className="space-y-2">

            {/* Biometric toggle */}
            <div className="card-interactive flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-xl bg-surface-800 flex items-center justify-center text-accent flex-shrink-0">
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

            {/* Screen security toggle */}
            <div className="card-interactive flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-xl bg-surface-800 flex items-center justify-center text-accent flex-shrink-0">
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

            {/* Session timeout selector */}
            <div className="card">
              <button
                id="session-timeout-button"
                type="button"
                onClick={() => setShowTimeoutPicker(!showTimeoutPicker)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-850 transition-colors rounded-2xl text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-surface-800 flex items-center justify-center text-accent flex-shrink-0">
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

        {/* === Capture Settings === */}
        <section className="px-4 pt-5 pb-2">
          <h2 className="text-xs font-bold text-content-secondary uppercase tracking-widest mb-2.5 px-1">
            Capture Configuration
          </h2>
          <div className="space-y-2">
            <div className="card-interactive flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-xl bg-surface-800 flex items-center justify-center text-accent flex-shrink-0">
                <Filter className="w-5 h-5 text-accent" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-content-primary">Spam & OTP Filter</p>
                <p className="text-xs text-content-muted mt-0.5 font-medium">Suppress one-time verification codes and ads</p>
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

        {/* === Data Management === */}
        <section className="px-4 pt-5 pb-2">
          <h2 className="text-xs font-bold text-content-secondary uppercase tracking-widest mb-2.5 px-1">
            Data Management
          </h2>
          <div className="space-y-2">
            <SettingsRow
              id="export-data-button"
              icon={<Download className="w-5 h-5 text-accent" strokeWidth={2} />}
              label="Export Encrypted Data"
              description="Save captured WhatsApp notifications as an encrypted backup"
              onClick={() => {}}
            />
            <SettingsRow
              id="wipe-data-button"
              icon={<Trash2 className="w-5 h-5 text-red-600" strokeWidth={2} />}
              label="Wipe All Data"
              description="Permanently delete all captured messages and reset settings"
              onClick={() => {}}
              danger
            />
          </div>
        </section>

        {/* === Support === */}
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

        {/* === Logout === */}
        <section className="px-4 pt-5 pb-8">
          <button
            id="logout-button"
            type="button"
            onClick={handleLogout}
            className="btn-danger w-full"
          >
            <LogOut className="w-4 h-4" strokeWidth={2.2} />
            Lock and Logout
          </button>
          <p className="text-2xs text-content-muted text-center mt-3 font-medium">
            NotiCatch v1.0.0 — Zero network permission. 100% on-device SQLite encryption.
          </p>
        </section>
      </div>
    </div>
  );
}
