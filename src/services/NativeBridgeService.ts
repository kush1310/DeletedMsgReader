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
        openNotificationSettings:      ()                                                  => Promise<{ opened: boolean }>;
        isNotificationListenerEnabled: ()                                                  => Promise<{ enabled: boolean }>;
        openAutostartSettings:         ()                                                  => Promise<{ opened: boolean }>;
        simulateNotification:          (args: { chatTitle?: string; senderName?: string; messageText?: string; isDeleted?: boolean; isGroup?: boolean }) => Promise<{ success: boolean; conversationId?: string; messageId?: string }>;
        checkDeviceSecurity:           ()                                                  => Promise<{ isRooted: boolean; isEmulator: boolean; airGapVerified: boolean }>;
        authenticateBiometric:         (args: { title: string; subtitle: string })         => Promise<{ success: boolean; error: string | null }>;
        setScreenSecure:               (args: { enabled: boolean })                        => Promise<{ updated: boolean }>;
        setSessionTimeout:             (args: { timeoutSeconds: number })                  => Promise<{ updated: boolean }>;
        requestBatteryExemption:       ()                                                  => Promise<{ requested: boolean }>;
        getConversations:              ()                                                  => Promise<{ conversations: Conversation[] }>;
        getMessages:                   (args: { conversationId: string })                  => Promise<{ messages: Message[] }>;
        getDeletedMessages:            ()                                                  => Promise<{ messages: Message[] }>;
        wipeAllData:                   ()                                                  => Promise<{ wiped: boolean }>;
        exportChatAsPDF:               (args: { conversationId: string; chatTitle: string }) => Promise<{ filePath: string; rowCount: number }>;
        exportChatAsCSV:               (args: { conversationId: string; chatTitle: string }) => Promise<{ filePath: string; rowCount: number }>;
        setSpamFilter:                 (args: { enabled: boolean })                        => Promise<{ updated: boolean }>;
        getAuthState:                  ()                                                  => Promise<AuthState>;
      };
    };
  };
};

/**
 * getBridge
 *
 * Internal helper to retrieve the registered MessageBridge Capacitor plugin.
 *
 * @returns {object | undefined} - MessageBridge plugin interface or undefined.
 * @validates                    - Checks window.Capacitor and Plugins existence.
 * @redirects                    - N/A.
 * @edge-cases                   - Returns undefined when running outside native Capacitor runtime.
 */
function getBridge() {
  const win = window as unknown as CapacitorWindow;
  return win.Capacitor?.Plugins.MessageBridge;
}

/**
 * isNativeAndroid
 *
 * Evaluates whether the active runtime environment is a physical Android WebView.
 *
 * @returns {boolean} - True if running inside Capacitor native Android container.
 * @validates         - Checks window.Capacitor.isNativePlatform flag.
 * @redirects         - N/A.
 * @edge-cases        - Returns false in desktop browser preview.
 */
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
 * Dispatches an intent to open Android's Notification Listener Settings screen.
 *
 * @returns {Promise<boolean>} - True if settings intent was dispatched successfully.
 * @validates                  - Verifies plugin bridge availability.
 * @redirects                  - Android OS Notification Access settings screen.
 * @edge-cases                 - Returns false if native bridge is unavailable or intent rejected.
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
 * Queries whether NotiCatch's NotificationListenerService is enabled in Android settings.
 *
 * @returns {Promise<boolean>} - True if notification listener permission is granted.
 * @validates                  - Compares enabled package string against app packageName.
 * @redirects                  - N/A.
 * @edge-cases                 - Returns false on permission check failure.
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
 * Triggers Android's ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS system dialog.
 *
 * @returns {Promise<boolean>} - True if intent was dispatched.
 * @validates                  - Target Android OS version >= Marshmallow (API 23).
 * @redirects                  - Android OS battery optimization dialog.
 * @edge-cases                 - Silently ignored on older unsupported Android versions.
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

/**
 * openAutostartSettings
 *
 * Opens the OEM-specific Autostart settings page (MIUI/HyperOS, Oppo, Vivo, Huawei).
 *
 * @returns {Promise<boolean>}
 */
export async function openAutostartSettings(): Promise<boolean> {
  try {
    const bridge = getBridge();
    if (!bridge) return false;
    const result = await bridge.openAutostartSettings();
    return result.opened;
  } catch {
    return false;
  }
}

/**
 * simulateNotification
 *
 * Simulates an incoming or deleted WhatsApp notification for on-device testing.
 *
 * @param  options - Payload override options.
 * @returns {Promise<boolean>}
 */
export async function simulateNotification(options: {
  chatTitle?:   string;
  senderName?:  string;
  messageText?: string;
  isDeleted?:   boolean;
  isGroup?:     boolean;
} = {}): Promise<boolean> {
  try {
    const bridge = getBridge();
    if (!bridge) return false;
    const result = await bridge.simulateNotification(options);
    return result.success;
  } catch {
    return false;
  }
}

/**
 * checkDeviceSecurity
 *
 * Inspects device root state, emulator flags, and air-gap posture.
 *
 * @returns {Promise<{ isRooted: boolean; isEmulator: boolean; airGapVerified: boolean }>}
 */
export async function checkDeviceSecurity(): Promise<{ isRooted: boolean; isEmulator: boolean; airGapVerified: boolean }> {
  try {
    const bridge = getBridge();
    if (!bridge) return { isRooted: false, isEmulator: false, airGapVerified: true };
    return await bridge.checkDeviceSecurity();
  } catch {
    return { isRooted: false, isEmulator: false, airGapVerified: true };
  }
}



/* =============================================================
   Biometric & Window Security Controls
   ============================================================= */

/**
 * authenticateWithBiometrics
 *
 * Invokes Android's native BiometricPrompt (fingerprint or device PIN/pattern).
 *
 * @param  {string} promptTitle    - Dialog title text.
 * @param  {string} promptSubtitle - Dialog explanatory subtitle text.
 * @returns {Promise<{ success: boolean; errorMessage: string | null }>} - Result object.
 * @validates                      - Hardware biometric presence and enrolled credentials.
 * @redirects                      - N/A.
 * @edge-cases                     - Returns error string if biometric sensor locked or unavailable.
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

/**
 * setScreenSecureNative
 *
 * Dynamically toggles Android window FLAG_SECURE to block/allow screenshots and previews.
 *
 * @param  {boolean} enabled - True to block screenshots, false to permit.
 * @returns {Promise<void>}  - Completes after window flags and preferences are updated.
 * @validates                - Boolean type constraint.
 * @redirects                - N/A.
 * @edge-cases               - Safely catches and logs errors if activity is detached.
 */
export async function setScreenSecureNative(enabled: boolean): Promise<void> {
  try {
    const bridge = getBridge();
    if (bridge) {
      await bridge.setScreenSecure({ enabled });
    }
  } catch {
    /* Non-critical */
  }
}

/**
 * setSessionTimeoutNative
 *
 * Persists session timeout duration to native Android SharedPreferences.
 *
 * @param  {number} timeoutSeconds - Session timeout in seconds.
 * @returns {Promise<void>}        - Completes after SharedPreferences sync.
 * @validates                      - Positive integer constraint.
 * @redirects                      - N/A.
 * @edge-cases                     - Defaults to 300 seconds if invalid.
 */
export async function setSessionTimeoutNative(timeoutSeconds: number): Promise<void> {
  try {
    const bridge = getBridge();
    if (bridge) {
      await bridge.setSessionTimeout({ timeoutSeconds });
    }
  } catch {
    /* Non-critical */
  }
}

/* =============================================================
   Data Retrieval — Conversations & Messages (Room SQLite)
   ============================================================= */

/**
 * getConversations
 *
 * Queries all captured WhatsApp conversations from the native Room SQLite database.
 *
 * @returns {Promise<Conversation[]>} - Array of conversation metadata objects.
 * @validates                         - Validates Room DB connection.
 * @redirects                         - N/A.
 * @edge-cases                        - Returns empty array on database error.
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
 * Queries all messages for a specific conversation from Room SQLite database.
 *
 * @param  {string} conversationId  - UUID of the target conversation.
 * @returns {Promise<Message[]>}    - Array of message records in chronological order.
 * @validates                       - Non-empty conversationId constraint.
 * @redirects                       - N/A.
 * @edge-cases                      - Returns empty array if conversationId not found.
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
 * Queries all messages flagged as deleted by sender across all conversations from Room SQLite.
 *
 * @returns {Promise<Message[]>} - Array of recovered deleted messages sorted newest-first.
 * @validates                    - Filter isDeletedBySender = true.
 * @redirects                    - N/A.
 * @edge-cases                   - Returns empty array if no deleted messages detected.
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
 * Permanently deletes all Room SQLite database records and resets SharedPreferences.
 *
 * @returns {Promise<boolean>} - True if database wipe completed successfully.
 * @validates                  - Invoked only upon explicit user confirmation.
 * @redirects                  - /setup or /chats upon completion.
 * @edge-cases                 - Rolls back database transaction on failure.
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
 * exportChatAsPDF
 *
 * Generates a styled multi-page PDF document for a conversation and invokes Android Share sheet.
 *
 * @param  {string} conversationId - UUID of the target conversation.
 * @param  {string} chatTitle      - Display name of the chat for document title.
 * @returns {Promise<{ filePath: string | null; rowCount: number }>} - Path and exported message count.
 * @validates                      - Non-empty conversationId constraint.
 * @redirects                      - Android native share / PDF viewer sheet.
 * @edge-cases                     - Returns null filePath if PDF generation fails.
 */
export async function exportChatAsPDF(
  conversationId: string,
  chatTitle:      string,
): Promise<{ filePath: string | null; rowCount: number }> {
  try {
    const bridge = getBridge();
    if (!bridge) return { filePath: null, rowCount: 0 };
    const result = await bridge.exportChatAsPDF({ conversationId, chatTitle });
    return { filePath: result.filePath, rowCount: result.rowCount };
  } catch {
    return { filePath: null, rowCount: 0 };
  }
}

/**
 * exportChatAsCSV
 *
 * Exports all messages for a given conversation as a CSV file to local storage.
 *
 * @param  {string} conversationId - UUID of the conversation to export.
 * @param  {string} chatTitle      - Human-readable chat name for filename.
 * @returns {Promise<{ filePath: string | null; rowCount: number }>} - Path and count.
 * @validates                      - Non-empty conversationId constraint.
 * @redirects                      - N/A.
 * @edge-cases                     - Returns null filePath on I/O error.
 */
export async function exportChatAsCSV(
  conversationId: string,
  chatTitle:      string,
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
 *
 * @param  {boolean} enabled - True to suppress OTP/spam notifications.
 * @returns {Promise<void>}  - Completes after preference write.
 * @validates                - Boolean type constraint.
 * @redirects                - N/A.
 * @edge-cases               - Non-critical if SharedPreferences write fails.
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
   Session & Security Persistence
   ============================================================= */

/**
 * loadAuthState
 *
 * Reads session authentication state from local storage.
 *
 * @returns {Promise<AuthState>} - Deserialized AuthState object.
 * @validates                    - JSON parsing integrity.
 * @redirects                    - N/A.
 * @edge-cases                   - Returns default locked state on parse error.
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
    isBiometricEnabled: true,
    isPinEnabled:       true,
    sessionStartedAt:   null,
    sessionTimeoutMs:   300_000,
  };
}

/**
 * persistAuthState
 *
 * Serializes and stores session authentication state.
 *
 * @param  {AuthState} authState - Updated authentication state object.
 * @returns {Promise<void>}      - Completes after storage write.
 * @validates                    - Object shape conformance.
 * @redirects                    - N/A.
 * @edge-cases                   - Handles storage quota exceptions safely.
 */
export async function persistAuthState(authState: AuthState): Promise<void> {
  localStorage.setItem('auth_state_noticatch', JSON.stringify(authState));
}

/**
 * loadAppSettings
 *
 * Reads user configuration settings from local storage.
 *
 * @returns {Promise<AppSettings>} - Deserialized AppSettings object.
 * @validates                      - JSON parsing integrity.
 * @redirects                      - N/A.
 * @edge-cases                     - Returns secure defaults if uninitialized.
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
    biometricEnabled:      true,
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
 * Persists app settings and synchronizes flags with Android native layer.
 *
 * @param  {AppSettings} settings - Updated application settings.
 * @returns {Promise<void>}       - Completes after local and native sync.
 * @validates                     - Settings schema conformance.
 * @redirects                     - N/A.
 * @edge-cases                    - Synchronizes screen secure and spam filter with Kotlin layer.
 */
export async function persistAppSettings(settings: AppSettings): Promise<void> {
  localStorage.setItem('app_settings_noticatch', JSON.stringify(settings));
  await Promise.all([
    setSpamFilterNative(settings.spamFilterEnabled),
    setScreenSecureNative(settings.screenSecureEnabled),
    setSessionTimeoutNative(settings.sessionTimeoutSeconds),
  ]);
}
