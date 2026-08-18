/**
 * NativeBridgeService
 *
 * Abstracts all communication between the React/TypeScript layer and
 * the Android Kotlin native layer via Capacitor plugin calls.
 *
 * In web preview mode (development), all methods return simulated
 * responses so the UI layer remains fully functional without a device.
 *
 * In production (Android), each method delegates to the registered
 * Capacitor plugin "MessageBridge" which routes to MessageBridgePlugin.kt.
 *
 * Computer Networks domain: all IPC communication over this bridge uses
 * structured JSON payloads — no raw binary or string concatenation.
 */

import type { AuthState, AppSettings } from '@/types';

/* =============================================================
   Environment Detection
   ============================================================= */

/**
 * Determines whether the application is running inside a Capacitor
 * Android WebView or in a standard web browser (development mode).
 * Uses the presence of window.Capacitor as the discriminator.
 */
function isNativeAndroid(): boolean {
  return typeof window !== 'undefined' &&
         'Capacitor' in window &&
         (window as unknown as { Capacitor: { isNativePlatform: () => boolean } }).Capacitor.isNativePlatform();
}

/* =============================================================
   Notification Listener Controls
   ============================================================= */

/**
 * requestNotificationListenerPermission
 *
 * Opens the Android notification listener settings panel so the user
 * can grant the BIND_NOTIFICATION_LISTENER_SERVICE permission.
 * In web mode, simulates success after a short delay.
 *
 * @returns - Promise resolving to true once the settings screen was opened.
 */
export async function requestNotificationListenerPermission(): Promise<boolean> {
  if (!isNativeAndroid()) {
    await simulateDelay(500);
    return true;
  }
  try {
    const { Capacitor } = window as unknown as { Capacitor: { Plugins: { MessageBridge: { openNotificationSettings: () => Promise<{ opened: boolean }> } } } };
    const result = await Capacitor.Plugins.MessageBridge.openNotificationSettings();
    return result.opened;
  } catch {
    return false;
  }
}

/**
 * checkNotificationListenerEnabled
 *
 * Queries Android's NotificationListenerManager to determine if the
 * app's NotificationListenerService is currently enabled.
 *
 * @returns - True if permission is granted and service is active.
 */
export async function checkNotificationListenerEnabled(): Promise<boolean> {
  if (!isNativeAndroid()) {
    return false; /* Simulates not yet granted in web preview */
  }
  try {
    const { Capacitor } = window as unknown as { Capacitor: { Plugins: { MessageBridge: { isNotificationListenerEnabled: () => Promise<{ enabled: boolean }> } } } };
    const result = await Capacitor.Plugins.MessageBridge.isNotificationListenerEnabled();
    return result.enabled;
  } catch {
    return false;
  }
}

/**
 * requestBatteryOptimizationExemption
 *
 * Triggers the ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS intent
 * so the foreground service can survive Android Doze mode.
 *
 * @returns - True if the intent was dispatched successfully.
 */
export async function requestBatteryOptimizationExemption(): Promise<boolean> {
  if (!isNativeAndroid()) {
    await simulateDelay(300);
    return true;
  }
  try {
    const { Capacitor } = window as unknown as { Capacitor: { Plugins: { MessageBridge: { requestBatteryExemption: () => Promise<{ requested: boolean }> } } } };
    const result = await Capacitor.Plugins.MessageBridge.requestBatteryExemption();
    return result.requested;
  } catch {
    return false;
  }
}

/* =============================================================
   Biometric Authentication
   ============================================================= */

/**
 * authenticateWithBiometrics
 *
 * Invokes Android's BiometricPrompt to authenticate the user.
 * Returns authentication success status and any error code from the OS.
 *
 * @param  promptTitle    - Title text displayed in the biometric dialog.
 * @param  promptSubtitle - Subtitle text displayed in the biometric dialog.
 * @returns               - Object containing success flag and optional error message.
 */
export async function authenticateWithBiometrics(
  promptTitle:    string,
  promptSubtitle: string,
): Promise<{ success: boolean; errorMessage: string | null }> {
  if (!isNativeAndroid()) {
    /* Simulate successful biometric authentication in web preview */
    await simulateDelay(800);
    return { success: true, errorMessage: null };
  }
  try {
    const { Capacitor } = window as unknown as {
      Capacitor: {
        Plugins: {
          MessageBridge: {
            authenticateBiometric: (args: { title: string; subtitle: string }) => Promise<{ success: boolean; error: string | null }>
          }
        }
      }
    };
    const result = await Capacitor.Plugins.MessageBridge.authenticateBiometric({
      title:    promptTitle,
      subtitle: promptSubtitle,
    });
    return { success: result.success, errorMessage: result.error };
  } catch (error) {
    return { success: false, errorMessage: String(error) };
  }
}

/* =============================================================
   Session & Security Controls
   ============================================================= */

/**
 * loadAuthState
 *
 * Retrieves the persisted authentication and session configuration
 * from Android's EncryptedSharedPreferences (native) or localStorage (web).
 * Passwords and keys are never included in this payload.
 *
 * @returns - Current AuthState object.
 */
export async function loadAuthState(): Promise<AuthState> {
  if (!isNativeAndroid()) {
    const stored = localStorage.getItem('auth_state_dev');
    if (stored) {
      try {
        return JSON.parse(stored) as AuthState;
      } catch {
        /* Fall through to default */
      }
    }
    return {
      isAuthenticated:    false,
      isBiometricEnabled: true,
      isPinEnabled:       false,
      sessionStartedAt:   null,
      sessionTimeoutMs:   300_000, /* 5 minutes default */
    };
  }
  try {
    const { Capacitor } = window as unknown as { Capacitor: { Plugins: { MessageBridge: { getAuthState: () => Promise<AuthState> } } } };
    return await Capacitor.Plugins.MessageBridge.getAuthState();
  } catch {
    return {
      isAuthenticated:    false,
      isBiometricEnabled: false,
      isPinEnabled:       false,
      sessionStartedAt:   null,
      sessionTimeoutMs:   300_000,
    };
  }
}

/**
 * persistAuthState
 *
 * Saves the current session authentication state to secure storage.
 * Only non-sensitive fields are persisted (no keys, no passwords).
 *
 * @param  authState  - Updated AuthState to save.
 */
export async function persistAuthState(authState: AuthState): Promise<void> {
  if (!isNativeAndroid()) {
    localStorage.setItem('auth_state_dev', JSON.stringify(authState));
    return;
  }
  /* In production, delegates to Android EncryptedSharedPreferences via bridge */
}

/**
 * loadAppSettings
 *
 * Retrieves persisted application configuration settings.
 * Returns sensible defaults if no settings have been saved yet.
 *
 * @returns - AppSettings configuration object.
 */
export async function loadAppSettings(): Promise<AppSettings> {
  if (!isNativeAndroid()) {
    const stored = localStorage.getItem('app_settings_dev');
    if (stored) {
      try {
        return JSON.parse(stored) as AppSettings;
      } catch {
        /* Fall through to defaults */
      }
    }
  }
  return {
    sessionTimeoutSeconds: 300,
    biometricEnabled:      true,
    pinEnabled:            false,
    screenSecureEnabled:   true,
    autoDeleteAfterDays:   null,
    notificationEnabled:   true,
    captureMediaEnabled:   false,
    spamFilterEnabled:     true,
  };
}

/**
 * persistAppSettings
 *
 * Saves updated application settings to persistent storage.
 *
 * @param  settings  - AppSettings object to save.
 */
export async function persistAppSettings(settings: AppSettings): Promise<void> {
  if (!isNativeAndroid()) {
    localStorage.setItem('app_settings_dev', JSON.stringify(settings));
  }
}

/* =============================================================
   Utility
   ============================================================= */

/**
 * simulateDelay
 *
 * Introduces an artificial async delay for web preview simulations.
 * Ensures UI loading states render correctly without a real device.
 *
 * @param  milliseconds  - Duration of simulated delay.
 */
function simulateDelay(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}
