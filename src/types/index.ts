/**
 * Central TypeScript type definitions for the NotiCatch application.
 *
 * All models map directly to the SQLite database schema and native bridge interfaces.
 * Strong typing is enforced throughout — zero `any` types.
 */

/* =============================================================
   Core Domain Models
   ============================================================= */

export interface Contact {
  readonly id:          string;
  readonly jid:         string;
  readonly displayName: string;
  readonly avatarUri:   string | null;
  readonly createdAt:   number;
  readonly updatedAt:   number;
}

export interface Conversation {
  readonly id:                   string;
  readonly conversationKey?:     string;
  readonly contactId?:           string;
  readonly chatTitle:            string;
  readonly isGroup:              boolean;
  readonly unreadCount:          number;
  readonly lastMessageTimestamp: number;
  readonly deletedCount:         number;
}

export interface Message {
  readonly id:                string;
  readonly conversationId:    string;
  readonly senderName:        string;
  readonly messageText:       string | null;
  readonly notificationId:    number;
  readonly timestamp:         number;
  readonly isDeletedBySender: boolean;
  readonly isEdited:          boolean;
  readonly mediaType:         MediaType | null;
  readonly mediaPath:         string | null;
  readonly hashSignature:     string;
  readonly isPurged?:         boolean;
  readonly purgedAt?:         number | null;
}

export type MediaType =
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'sticker'
  | 'contact'
  | 'location';

/* =============================================================
   Entity Extraction & Heuristic Classification
   ============================================================= */

export type ExtractedEntityType =
  | 'PHONE_NUMBER'
  | 'URL'
  | 'EMAIL'
  | 'MEETING_TIME'
  | 'OTP_CODE'
  | 'ADDRESS';

export interface ExtractedEntity {
  readonly type:  ExtractedEntityType;
  readonly value: string;
  readonly label: string;
}

export interface MerkleAuditResult {
  readonly isValid:         boolean;
  readonly totalMessages:   number;
  readonly rootHash:        string;
  readonly verifiedAt:      number;
  readonly compromisedCount: number;
}

export interface DeviceSecurityStatus {
  readonly isRooted:        boolean;
  readonly isEmulator:      boolean;
  readonly airGapVerified:  boolean;
  readonly flagSecureActive: boolean;
}

/* =============================================================
   Audit Log & Classification Engine Types
   ============================================================= */

export interface AuditLog {
  readonly id:           string;
  readonly eventType:    AuditEventType;
  readonly eventPayload: string;
  readonly timestamp:    number;
  readonly logHash:      string;
}

export type AuditEventType =
  | 'APP_UNLOCKED'
  | 'APP_LOCKED'
  | 'MESSAGE_CAPTURED'
  | 'MESSAGE_DELETED_DETECTED'
  | 'NOTIFICATION_SERVICE_STARTED'
  | 'NOTIFICATION_SERVICE_STOPPED'
  | 'SETTINGS_CHANGED'
  | 'EXPORT_PERFORMED'
  | 'DATABASE_WIPED'
  | 'MERKLE_AUDIT_VERIFIED';

export interface RawNotificationPayload {
  readonly packageName:    string;
  readonly notificationId: number;
  readonly title:          string;
  readonly text:           string;
  readonly subText:        string | null;
  readonly timestamp:      number;
  readonly groupKey:       string | null;
}

export interface ClassificationResult {
  readonly classification:  NotificationClassification;
  readonly confidence:      number;
  readonly isDeletion:      boolean;
  readonly isEdit:          boolean;
  readonly isSystemMessage: boolean;
  readonly normalizedText:  string | null;
}

export type NotificationClassification =
  | 'USER_MESSAGE'
  | 'DELETION_SIGNAL'
  | 'EDIT_SIGNAL'
  | 'SYSTEM_NOTICE'
  | 'OTP_SPAM'
  | 'GROUP_METADATA'
  | 'UNKNOWN';

/* =============================================================
   UI & Application State Types
   ============================================================= */

export interface AuthState {
  readonly isAuthenticated:    boolean;
  readonly isBiometricEnabled: boolean;
  readonly isPinEnabled:       boolean;
  readonly sessionStartedAt:   number | null;
  readonly sessionTimeoutMs:   number;
}

export interface AppStats {
  readonly totalMessagesCaputred:  number;
  readonly totalDeletedRecovered:  number;
  readonly totalConversations:     number;
  readonly totalContacts:          number;
  readonly oldestCaptureTimestamp: number | null;
  readonly storageSizeBytes:       number;
}

export interface AppSettings {
  readonly sessionTimeoutSeconds: number;
  readonly biometricEnabled:      boolean;
  readonly pinEnabled:            boolean;
  readonly screenSecureEnabled:   boolean;
  readonly autoDeleteAfterDays:   number | null;
  readonly notificationEnabled:   boolean;
  readonly captureMediaEnabled:   boolean;
  readonly spamFilterEnabled:     boolean;
}

export type NavTab = 'chats' | 'deleted' | 'settings';

export type ToastSeverity = 'info' | 'success' | 'warning' | 'error';

export interface ToastMessage {
  readonly id:         string;
  readonly message:    string;
  readonly severity:   ToastSeverity;
  readonly durationMs: number;
}
