/**
 * NativeBridgeService
 *
 * Direct communication bridge between the React TypeScript UI and
 * the Android Kotlin native layer via Capacitor plugin calls.
 *
 * In NotiCatch, all persistence, notification capture, and security operations
 * execute strictly on the Android OS level via Room SQLite Database and
 * NotificationListenerService.
 */

import type { AuthState, AppSettings, Conversation, Message } from '@/types';

type CapacitorWindow = {
  Capacitor?: {
    isNativePlatform: () => boolean;
    Plugins: {
      MessageBridge: {
        openNotificationSettings:  ()                              => Promise<{ opened: boolean }>;
        isNotificationListenerEnabled: ()                          => Promise<{ enabled: boolean }>;
        authenticateBiometric:     (args: { title: string; subtitle: string }) => Promise<{ success: boolean; error: string | null }>;
        requestBatteryExemption:   ()                              => Promise<{ requested: boolean }>;
        getConversations:          ()                              => Promise<{ conversations: Conversation[] }>;
        getMessages:               (args: { conversationId: string }) => Promise<{ messages: Message[] }>;
        getDeletedMessages:        ()                              => Promise<{ messages: Message[] }>;
        wipeAllData:               ()                              => Promise<{ wiped: boolean }>;
        exportChatAsCSV:           (args: { conversationId: string; chatTitle: string }) => Promise<{ filePath: string; rowCount: number }>;
        setSpamFilter:             (args: { enabled: boolean })    => Promise<{ updated: boolean }>;
        getAuthState:              ()                              => Promise<AuthState>;
      };
    };
  };
};

function getBridge() {
  const win = window as unknown as CapacitorWindow;
  return win.Capacitor?.Plugins.MessageBridge;
}

export function isNativeAndroid(): boolean {
  const win = window as unknown as CapacitorWindow;
  return Boolean(win.Capacitor?.isNativePlatform?.());
}

/* =============================================================
   Notification Listener Controls
   ============================================================= */

/**
 * requestNotificationListenerPermission
 *
 * Opens the Android system notification access settings screen.
 */
export async function requestNotificationListenerPermission(): Promise<boolean> {
  try {
    const bridge = getBridge();
    if (!bridge) return false;
    const result = await bridge.openNotificationSettings();
    return result.opened;
  } catch {
    return false;
  }
}

/**
 * checkNotificationListenerEnabled
 *
 * Queries whether NotiCatch's NotificationListenerService is enabled.
 */
export async function checkNotificationListenerEnabled(): Promise<boolean> {
  try {
    const bridge = getBridge();
    if (!bridge) return false;
    const result = await bridge.isNotificationListenerEnabled();
    return result.enabled;
  } catch {
    return false;
  }
}

/**
 * requestBatteryOptimizationExemption
 *
 * Triggers ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS intent.
 */
export async function requestBatteryOptimizationExemption(): Promise<boolean> {
  try {
    const bridge = getBridge();
    if (!bridge) return false;
    const result = await bridge.requestBatteryExemption();
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
 * Invokes Android BiometricPrompt for fingerprint/device authentication.
 */
export async function authenticateWithBiometrics(
  promptTitle:    string,
  promptSubtitle: string,
): Promise<{ success: boolean; errorMessage: string | null }> {
  try {
    const bridge = getBridge();
    if (!bridge) {
      return { success: false, errorMessage: 'Native biometric bridge not initialized.' };
    }
    const result = await bridge.authenticateBiometric({
      title:    promptTitle,
      subtitle: promptSubtitle,
    });
    return { success: result.success, errorMessage: result.error };
  } catch (error) {
    return { success: false, errorMessage: String(error) };
  }
}

/* =============================================================
   Data Retrieval — Conversations & Messages (Room SQLite)
   ============================================================= */

/**
 * getConversations
 *
 * Returns all captured conversations from Room SQLite database.
 */
export async function getConversations(): Promise<Conversation[]> {
  try {
    const bridge = getBridge();
    if (!bridge) return [];
    const result = await bridge.getConversations();
    return result.conversations ?? [];
  } catch {
    return [];
  }
}

/**
 * getMessages
 *
 * Returns all messages for a given conversation from Room SQLite database.
 */
export async function getMessages(conversationId: string): Promise<Message[]> {
  try {
    const bridge = getBridge();
    if (!bridge) return [];
    const result = await bridge.getMessages({ conversationId });
    return result.messages ?? [];
  } catch {
    return [];
  }
}

/**
 * getDeletedMessages
 *
 * Returns all deleted messages across all conversations from Room SQLite database.
 */
export async function getDeletedMessages(): Promise<Message[]> {
  try {
    const bridge = getBridge();
    if (!bridge) return [];
    const result = await bridge.getDeletedMessages();
    return result.messages ?? [];
  } catch {
    return [];
  }
}

/* =============================================================
   Data Management — Wipe & Export
   ============================================================= */

/**
 * wipeAllData
 *
 * Permanently purges all Room SQLite database records and app preferences.
 */
export async function wipeAllData(): Promise<boolean> {
  try {
    const bridge = getBridge();
    if (bridge) {
      const result = await bridge.wipeAllData();
      return result.wiped;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * exportChatAsCSV
 *
 * Exports all messages for a conversation as a CSV file written to device storage.
 */
export async function exportChatAsCSV(
  conversationId: string,
  chatTitle:      string,
  _messages?:     Message[],
): Promise<{ filePath: string | null; rowCount: number }> {
  try {
    const bridge = getBridge();
    if (!bridge) return { filePath: null, rowCount: 0 };
    const result = await bridge.exportChatAsCSV({ conversationId, chatTitle });
    return { filePath: result.filePath, rowCount: result.rowCount };
  } catch {
    return { filePath: null, rowCount: 0 };
  }
}

/**
 * setSpamFilterNative
 *
 * Pushes spam filter preference to Android SharedPreferences.
 */
export async function setSpamFilterNative(enabled: boolean): Promise<void> {
  try {
    const bridge = getBridge();
    if (bridge) {
      await bridge.setSpamFilter({ enabled });
    }
  } catch {
    /* Non-critical */
  }
}

/* =============================================================
   Session & Security Controls
   ============================================================= */

export async function loadAuthState(): Promise<AuthState> {
  const stored = localStorage.getItem('auth_state_noticatch');
  if (stored) {
    try {
      return JSON.parse(stored) as AuthState;
    } catch {
      /* fall through to default */
    }
  }
  return {
    isAuthenticated:    false,
    isBiometricEnabled: true,
    isPinEnabled:       true,
    sessionStartedAt:   null,
    sessionTimeoutMs:   300_000,
  };
}

export async function persistAuthState(authState: AuthState): Promise<void> {
  localStorage.setItem('auth_state_noticatch', JSON.stringify(authState));
}

export async function loadAppSettings(): Promise<AppSettings> {
  const stored = localStorage.getItem('app_settings_noticatch');
  if (stored) {
    try {
      return JSON.parse(stored) as AppSettings;
    } catch {
      /* fall through to defaults */
    }
  }
  return {
    sessionTimeoutSeconds: 300,
    biometricEnabled:      true,
    pinEnabled:            true,
    screenSecureEnabled:   true,
    autoDeleteAfterDays:   null,
    notificationEnabled:   true,
    captureMediaEnabled:   false,
    spamFilterEnabled:     true,
  };
}

export async function persistAppSettings(settings: AppSettings): Promise<void> {
  localStorage.setItem('app_settings_noticatch', JSON.stringify(settings));
  await setSpamFilterNative(settings.spamFilterEnabled);
}
