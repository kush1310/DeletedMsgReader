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
  readonly id:                    string;
  readonly conversationId:        string;
  readonly senderName:            string;
  readonly messageText:           string | null;
  readonly originalText?:         string | null;
  readonly notificationId:        number;
  readonly timestamp:             number;
  readonly isDeletedBySender:     boolean;
  readonly isEdited:              boolean;
  readonly editCount?:            number;
  readonly editedAt?:             number | null;
  readonly mediaType:             MediaType | null;
  readonly mediaPath:             string | null;
  readonly audioDurationSeconds?: number | null;
  readonly isDisappearing?:       boolean;
  readonly hashSignature:         string;
  readonly isPurged?:             boolean;
  readonly purgedAt?:             number | null;
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
  readonly isValid:          boolean;
  readonly totalMessages:    number;
  readonly rootHash:         string;
  readonly verifiedAt:       number;
  readonly compromisedCount: number;
}

export interface DeviceSecurityStatus {
  readonly isRooted:         boolean;
  readonly isEmulator:       boolean;
  readonly airGapVerified:   boolean;
  readonly flagSecureActive: boolean;
}

export interface KernelSocketStats {
  readonly activeSockets:              number;
  readonly openTcpPorts:               number;
  readonly openUdpPorts:               number;
  readonly bytesTransmitted:           number;
  readonly bytesReceived:              number;
  readonly airGapVerified:             boolean;
  readonly internetPermissionPresent:  boolean;
}

export type DiffType = 'ADDED' | 'REMOVED' | 'UNCHANGED';

export interface DiffChunk {
  readonly type: DiffType;
  readonly text: string;
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
  | 'DATABASE_INIT'
  | 'KEY_DERIVATION'
  | 'MESSAGE_PERSISTED'
  | 'MESSAGE_DELETED_BY_SENDER'
  | 'MESSAGE_EDITED_BY_SENDER'
  | 'INTEGRITY_CHECK_PASSED'
  | 'INTEGRITY_CHECK_FAILED'
  | 'SESSION_UNLOCKED'
  | 'SESSION_LOCKED'
  | 'DATA_EXPORTED'
  | 'DATABASE_PURGED'
  | 'SECURITY_EVENT';

export type NotificationClassification =
  | 'USER_MESSAGE'
  | 'STANDARD_MESSAGE'
  | 'DELETION_SIGNAL'
  | 'EDIT_SIGNAL'
  | 'SYSTEM_NOTICE'
  | 'OTP_SPAM'
  | 'UNKNOWN_PACKAGE'
  | 'EMPTY_PAYLOAD';

export type ClassificationType = NotificationClassification;

export interface ClassificationResult {
  readonly classification:       NotificationClassification;
  readonly type?:                NotificationClassification;
  readonly isDeletion:           boolean;
  readonly isEdit:               boolean;
  readonly isSystemMessage?:     boolean;
  readonly normalizedText?:      string | null;
  readonly confidence:           number;
  readonly extractedSender:      string | null;
  readonly extractedOriginalText?: string | null;
  readonly matchedPattern:       string | null;
}

export interface SearchMatch {
  readonly messageId:        string;
  readonly conversationId:   string;
  readonly senderName:       string;
  readonly messageText:      string;
  readonly timestamp:        number;
  readonly isDeleted:        boolean;
  readonly isEdited:         boolean;
  readonly score:            number;
  readonly highlightIndices: readonly [number, number][];
}

export interface AppSettings {
  readonly biometricEnabled:      boolean;
  readonly isPinSet:              boolean;
  readonly isDuressPinSet:        boolean;
  readonly sessionTimeoutSeconds: number;
  readonly screenSecureEnabled:   boolean;
  readonly airGapModeActive:      boolean;
  readonly spamFilterEnabled:     boolean;
  readonly theme:                 'light' | 'dark' | 'system';
  readonly lastIntegrityCheck:    number | null;
  readonly databaseVersion:       number;
}

export interface RawNotificationPayload {
  readonly packageName:    string;
  readonly notificationId: number;
  readonly title:          string;
  readonly text:           string | null;
  readonly subText:        string | null;
  readonly timestamp:      number;
  readonly groupKey:       string | null;
}

export type NavTab = 'chats' | 'deleted' | 'settings';

export type ToastSeverity = 'info' | 'success' | 'warning' | 'error';

export interface ToastMessage {
  readonly id:        string;
  readonly message:   string;
  readonly severity:  ToastSeverity;
  readonly timestamp: number;
}
