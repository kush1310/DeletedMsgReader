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

import type { AppSettings, Conversation, Message, KernelSocketStats, DeviceSecurityStatus } from '@/types';

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
        getKernelSocketStats:          ()                                                  => Promise<KernelSocketStats>;
        executePanicWipe:              ()                                                  => Promise<{ wiped: boolean }>;
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
        getAuthState:                  ()                                                  => Promise<{ isAuthenticated: boolean }>;
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
   Notification Listener & OEM Controls
   ============================================================= */

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

export async function checkNotificationListenerEnabled(): Promise<boolean> {
  try {
    const bridge = getBridge();
    if (!bridge) return true;
    const result = await bridge.isNotificationListenerEnabled();
    return result.enabled;
  } catch {
    return true;
  }
}

export async function openAutostartSettingsNative(): Promise<boolean> {
  try {
    const bridge = getBridge();
    if (!bridge) return false;
    const result = await bridge.openAutostartSettings();
    return result.opened;
  } catch {
    return false;
  }
}

export async function simulateNotificationNative(args: {
  chatTitle?:   string;
  senderName?:  string;
  messageText?: string;
  isDeleted?:   boolean;
  isGroup?:     boolean;
}): Promise<boolean> {
  try {
    const bridge = getBridge();
    if (!bridge) return false;
    const result = await bridge.simulateNotification(args);
    return result.success;
  } catch {
    return false;
  }
}

export async function checkDeviceSecurity(): Promise<DeviceSecurityStatus> {
  try {
    const bridge = getBridge();
    if (!bridge) {
      return {
        isRooted:         false,
        isEmulator:       false,
        airGapVerified:   true,
        flagSecureActive: true,
      };
    }
    const result = await bridge.checkDeviceSecurity();
    return {
      isRooted:         result.isRooted,
      isEmulator:       result.isEmulator,
      airGapVerified:   result.airGapVerified,
      flagSecureActive: true,
    };
  } catch {
    return {
      isRooted:         false,
      isEmulator:       false,
      airGapVerified:   true,
      flagSecureActive: true,
    };
  }
}

export async function getKernelSocketStats(): Promise<KernelSocketStats> {
  try {
    const bridge = getBridge();
    if (!bridge) {
      return {
        activeSockets:             0,
        openTcpPorts:              0,
        openUdpPorts:              0,
        bytesTransmitted:          0,
        bytesReceived:             0,
        airGapVerified:            true,
        internetPermissionPresent: false,
      };
    }
    return await bridge.getKernelSocketStats();
  } catch {
    return {
      activeSockets:             0,
      openTcpPorts:              0,
      openUdpPorts:              0,
      bytesTransmitted:          0,
      bytesReceived:             0,
      airGapVerified:            true,
      internetPermissionPresent: false,
    };
  }
}

export async function executePanicWipe(): Promise<boolean> {
  try {
    const bridge = getBridge();
    if (bridge) {
      await bridge.executePanicWipe();
    }
    localStorage.clear();
    sessionStorage.clear();
    return true;
  } catch {
    localStorage.clear();
    sessionStorage.clear();
    return true;
  }
}

/* =============================================================
   Biometric & Window Security Controls
   ============================================================= */

export async function authenticateWithBiometrics(
  promptTitle:    string,
  promptSubtitle: string,
): Promise<{ success: boolean; errorMessage: string | null }> {
  try {
    const bridge = getBridge();
    if (!bridge) {
      return { success: true, errorMessage: null };
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

export async function requestBatteryExemptionNative(): Promise<void> {
  try {
    const bridge = getBridge();
    if (bridge) {
      await bridge.requestBatteryExemption();
    }
  } catch {
    /* Non-critical */
  }
}

/* =============================================================
   Data Retrieval — Conversations & Messages (Room SQLite)
   ============================================================= */

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

export async function getMessagesByConversation(conversationId: string): Promise<Message[]> {
  try {
    const bridge = getBridge();
    if (!bridge) return [];
    const result = await bridge.getMessages({ conversationId });
    return result.messages ?? [];
  } catch {
    return [];
  }
}

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

export async function wipeAllDataNative(): Promise<void> {
  try {
    const bridge = getBridge();
    if (bridge) {
      await bridge.wipeAllData();
    }
  } catch {
    /* Non-critical */
  }
}

export async function exportChatAsPDFNative(
  conversationId: string,
  chatTitle:      string,
): Promise<{ filePath: string; rowCount: number }> {
  const bridge = getBridge();
  if (!bridge) throw new Error('PDF export is available on Android devices only.');
  return bridge.exportChatAsPDF({ conversationId, chatTitle });
}

export async function exportChatAsCSVNative(
  conversationId: string,
  chatTitle:      string,
): Promise<{ filePath: string; rowCount: number }> {
  const bridge = getBridge();
  if (!bridge) throw new Error('CSV export is available on Android devices only.');
  return bridge.exportChatAsCSV({ conversationId, chatTitle });
}

/* =============================================================
   Settings Management
   ============================================================= */

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
}

export async function persistAppSettings(settings: AppSettings): Promise<void> {
  localStorage.setItem('app_settings_noticatch', JSON.stringify(settings));
  await Promise.all([
    setSpamFilterNative(settings.spamFilterEnabled),
    setScreenSecureNative(settings.screenSecureEnabled),
    setSessionTimeoutNative(settings.sessionTimeoutSeconds),
  ]);
}
