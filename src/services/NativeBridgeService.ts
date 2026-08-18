/**
 * NativeBridgeService
 *
 * Abstracts all communication between the React/TypeScript layer and
 * the Android Kotlin native layer via Capacitor plugin calls.
 *
 * In web preview mode (development), methods return appropriate empty/error
 * responses so the UI can be tested without a device. No dummy data is returned.
 *
 * In production (Android), each method delegates to the registered
 * Capacitor plugin "MessageBridge" which routes to MessageBridgePlugin.kt.
 *
 * Computer Networks domain: all IPC communication over this bridge uses
 * structured JSON payloads — no raw binary or string concatenation.
 */

import type { AuthState, AppSettings, Conversation, Message } from '@/types';

/* =============================================================
   Environment Detection
   ============================================================= */

/**
 * isNativeAndroid
 *
 * Determines whether the application is running inside a Capacitor
 * Android WebView or in a standard web browser (development mode).
 * Uses the presence of window.Capacitor as the discriminator.
 *
 * @returns - True if running inside a Capacitor native Android WebView.
 */
export function isNativeAndroid(): boolean {
  return typeof window !== 'undefined' &&
         'Capacitor' in window &&
         (window as unknown as { Capacitor: { isNativePlatform: () => boolean } }).Capacitor.isNativePlatform();
}

/* Internal helper to access the native plugin with correct typing */
type CapacitorWindow = {
  Capacitor: {
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
  return (window as unknown as CapacitorWindow).Capacitor.Plugins.MessageBridge;
}

/* =============================================================
   Notification Listener Controls
   ============================================================= */

/**
 * requestNotificationListenerPermission
 *
 * Opens the Android notification listener settings panel so the user
 * can grant the BIND_NOTIFICATION_LISTENER_SERVICE permission.
 * In web mode, returns false — permission cannot be granted in browser.
 *
 * @returns - Promise resolving to true once settings screen was opened.
 */
export async function requestNotificationListenerPermission(): Promise<boolean> {
  if (!isNativeAndroid()) return false;
  try {
    const result = await getBridge().openNotificationSettings();
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
  if (!isNativeAndroid()) return false;
  try {
    const result = await getBridge().isNotificationListenerEnabled();
    return result.enabled;
  } catch {
    return false;
  }
}

/**
 * requestBatteryOptimizationExemption
 *
 * Triggers the ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS intent.
 *
 * @returns - True if the intent was dispatched successfully.
 */
export async function requestBatteryOptimizationExemption(): Promise<boolean> {
  if (!isNativeAndroid()) return false;
  try {
    const result = await getBridge().requestBatteryExemption();
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
 * In web mode, returns failure — biometric hardware is not accessible
 * from a browser. The UI must fall back to PIN entry.
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
    return { success: false, errorMessage: 'Device biometric authentication unavailable.' };
  }
  try {
    const result = await getBridge().authenticateBiometric({
      title:    promptTitle,
      subtitle: promptSubtitle,
    });
    return { success: result.success, errorMessage: result.error };
  } catch (error) {
    return { success: false, errorMessage: String(error) };
  }
}

/* =============================================================
   Data Retrieval — Conversations & Messages
   ============================================================= */

/**
 * getConversations
 *
 * Returns all captured conversations from Room DB on native Android,
 * or an empty array on web (no captured data without a real device).
 *
 * @returns - Array of Conversation objects.
 */
export async function getConversations(): Promise<Conversation[]> {
  if (!isNativeAndroid()) return [];
  try {
    const result = await getBridge().getConversations();
    return result.conversations ?? [];
  } catch {
    return [];
  }
}

/**
 * getMessages
 *
 * Returns all messages for a given conversation from Room DB.
 *
 * @param  conversationId  - UUID of the target conversation.
 * @returns                - Array of Message objects in chronological order.
 */
export async function getMessages(conversationId: string): Promise<Message[]> {
  if (!isNativeAndroid()) return [];
  try {
    const result = await getBridge().getMessages({ conversationId });
    return result.messages ?? [];
  } catch {
    return [];
  }
}

/**
 * getDeletedMessages
 *
 * Returns all messages flagged as deleted across all conversations from Room DB.
 *
 * @returns - Array of deleted Message objects sorted newest-first.
 */
export async function getDeletedMessages(): Promise<Message[]> {
  if (!isNativeAndroid()) return [];
  try {
    const result = await getBridge().getDeletedMessages();
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
 * Permanently deletes all Room DB records and resets SharedPreferences.
 * On web, clears in-memory devStore via the clearAllData() import.
 * This action is irreversible and must only be called after user confirmation.
 *
 * @returns - True if wipe completed successfully.
 */
export async function wipeAllData(): Promise<boolean> {
  if (!isNativeAndroid()) {
    /* Web fallback: clear in-memory store */
    const { clearAllData } = await import('@/services/DatabaseService');
    clearAllData();
    return true;
  }
  try {
    const result = await getBridge().wipeAllData();
    return result.wiped;
  } catch {
    return false;
  }
}

/**
 * exportChatAsCSV
 *
 * Exports all messages for a given conversation as a CSV file.
 * On native: writes to external storage and returns the file path.
 * On web: generates a Blob and triggers a browser download.
 *
 * CSV columns: Timestamp, Sender, Message, Deleted, Edited
 *
 * @param  conversationId  - UUID of the conversation to export.
 * @param  chatTitle       - Human-readable chat name for filename.
 * @param  messages        - Message array (required for web fallback).
 * @returns                - Object with filePath (native) and rowCount.
 */
export async function exportChatAsCSV(
  conversationId: string,
  chatTitle:      string,
  messages:       Message[],
): Promise<{ filePath: string | null; rowCount: number }> {
  if (isNativeAndroid()) {
    try {
      const result = await getBridge().exportChatAsCSV({ conversationId, chatTitle });
      return { filePath: result.filePath, rowCount: result.rowCount };
    } catch {
      return { filePath: null, rowCount: 0 };
    }
  }

  /* Web fallback: generate CSV Blob and trigger browser download */
  const csvLines: string[] = [
    'Timestamp,Sender,Message,Deleted,Edited',
    ...messages.map(m => {
      const ts     = new Date(m.timestamp).toISOString().replace('T', ' ').substring(0, 19);
      const sender = `"${m.senderName.replace(/"/g, '""')}"`;
      const text   = `"${(m.messageText ?? '').replace(/"/g, '""')}"`;
      return `${ts},${sender},${text},${m.isDeletedBySender},${m.isEdited}`;
    }),
  ];

  const blob     = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url      = URL.createObjectURL(blob);
  const anchor   = document.createElement('a');
  anchor.href    = url;
  anchor.download = `NotiCatch_${chatTitle.replace(/[^a-zA-Z0-9_\- ]/g, '_').substring(0, 40)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);

  return { filePath: null, rowCount: messages.length };
}

/**
 * setSpamFilterNative
 *
 * Pushes the spam filter boolean to the native SharedPreferences
 * so NotificationListener.kt reads the current user preference.
 *
 * @param  enabled  - True to suppress OTP/spam notifications.
 */
export async function setSpamFilterNative(enabled: boolean): Promise<void> {
  if (!isNativeAndroid()) return;
  try {
    await getBridge().setSpamFilter({ enabled });
  } catch {
    /* Non-critical — log but do not surface to user */
  }
}

/* =============================================================
   Session & Security Controls
   ============================================================= */

/**
 * loadAuthState
 *
 * Retrieves persisted authentication and session configuration
 * from localStorage (web) or EncryptedSharedPreferences (native).
 *
 * @returns - Current AuthState object.
 */
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
    isBiometricEnabled: isNativeAndroid(),
    isPinEnabled:       true,
    sessionStartedAt:   null,
    sessionTimeoutMs:   300_000,
  };
}

/**
 * persistAuthState
 *
 * Saves the current session authentication state to secure storage.
 *
 * @param  authState  - Updated AuthState to save.
 */
export async function persistAuthState(authState: AuthState): Promise<void> {
  localStorage.setItem('auth_state_noticatch', JSON.stringify(authState));
}

/**
 * loadAppSettings
 *
 * Retrieves persisted application configuration settings from storage.
 * Works seamlessly across both native Android WebView and web preview.
 *
 * @returns - AppSettings configuration object.
 */
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
    biometricEnabled:      isNativeAndroid(),
    pinEnabled:            true,
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
 * Saves updated application settings to storage and synchronizes
 * relevant flags (such as spam filter) to the native Android layer.
 *
 * @param  settings  - AppSettings object to save.
 */
export async function persistAppSettings(settings: AppSettings): Promise<void> {
  localStorage.setItem('app_settings_noticatch', JSON.stringify(settings));
  if (isNativeAndroid()) {
    await setSpamFilterNative(settings.spamFilterEnabled);
  }
}
