/**
 * Central TypeScript type definitions for the Ghost Reader application.
 *
 * All models map directly to the SQLite database schema defined in the
 * implementation plan. Strong typing is enforced throughout — no `any` types.
 */

/* =============================================================
   Core Domain Models
   ============================================================= */

/**
 * Represents a WhatsApp contact whose notifications have been intercepted.
 *
 * @field id            - UUIDv4 primary key generated locally.
 * @field jid           - WhatsApp internal JID identifier (e.g. "915551234567@s.whatsapp.net").
 * @field displayName   - Human-readable name from notification title or contact book.
 * @field avatarUri     - Local file URI for cached contact avatar (nullable).
 * @field createdAt     - Unix epoch milliseconds when first seen.
 * @field updatedAt     - Unix epoch milliseconds of last modification.
 */
export interface Contact {
  id:          string;
  jid:         string;
  displayName: string;
  avatarUri:   string | null;
  createdAt:   number;
  updatedAt:   number;
}

/**
 * Represents a WhatsApp conversation thread (individual or group).
 *
 * @field id                  - UUIDv4 primary key.
 * @field contactId           - FK → contacts.id
 * @field chatTitle           - Display name of conversation (contact or group name).
 * @field isGroup             - Whether this is a group conversation.
 * @field unreadCount         - Count of messages not yet reviewed by user.
 * @field lastMessageTimestamp - Unix epoch ms of the most recent captured message.
 * @field deletedCount        - Number of deleted messages recovered in this conversation.
 */
export interface Conversation {
  id:                   string;
  contactId:            string;
  chatTitle:            string;
  isGroup:              boolean;
  unreadCount:          number;
  lastMessageTimestamp: number;
  deletedCount:         number;
}

/**
 * Represents a single captured WhatsApp message or media notification.
 *
 * @field id                 - UUIDv4 primary key.
 * @field conversationId     - FK → conversations.id
 * @field senderName         - Name of the message sender within the notification.
 * @field messageText        - Captured notification body text (may be null for media-only).
 * @field notificationId     - Android system notification ID used for deduplication.
 * @field timestamp          - Unix epoch ms when notification was received.
 * @field isDeletedBySender  - True when a deletion notification was detected for this message.
 * @field isEdited           - True when an edit notification was detected.
 * @field mediaType          - Type of media attachment if present (null for text-only).
 * @field mediaPath          - Local file path to saved media file (nullable).
 * @field hashSignature      - SHA-256 of (senderName + timestamp + messageText + conversationId)
 *                             used for tamper detection and deduplication.
 */
export interface Message {
  id:                string;
  conversationId:    string;
  senderName:        string;
  messageText:       string | null;
  notificationId:    number;
  timestamp:         number;
  isDeletedBySender: boolean;
  isEdited:          boolean;
  mediaType:         MediaType | null;
  mediaPath:         string | null;
  hashSignature:     string;
}

/**
 * Enumeration of supported WhatsApp media attachment types
 * that may appear in notification payloads.
 */
export type MediaType =
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'sticker'
  | 'contact'
  | 'location';

/**
 * Represents a tamper-evident audit log entry.
 * Each entry contains the HMAC-SHA256 of the previous entry's log_hash,
 * forming an append-only chain for integrity verification.
 *
 * @field id           - UUIDv4 primary key.
 * @field eventType    - Classification of the audit event.
 * @field eventPayload - JSON-serialized event context (sanitized, no raw message text).
 * @field timestamp    - Unix epoch ms.
 * @field logHash      - HMAC-SHA256(previousLogHash + eventType + eventPayload + timestamp).
 */
export interface AuditLog {
  id:           string;
  eventType:    AuditEventType;
  eventPayload: string;
  timestamp:    number;
  logHash:      string;
}

/**
 * Valid audit event type identifiers for classification.
 */
export type AuditEventType =
  | 'APP_UNLOCKED'
  | 'APP_LOCKED'
  | 'MESSAGE_CAPTURED'
  | 'MESSAGE_DELETED_DETECTED'
  | 'NOTIFICATION_SERVICE_STARTED'
  | 'NOTIFICATION_SERVICE_STOPPED'
  | 'SETTINGS_CHANGED'
  | 'EXPORT_PERFORMED'
  | 'DATABASE_WIPED';

/* =============================================================
   Classification Engine Types
   ============================================================= */

/**
 * Input payload fed to the ClassificationEngine from a raw Android notification.
 *
 * @field packageName    - Source app package (expected: "com.whatsapp" or "com.whatsapp.w4b").
 * @field notificationId - Android system notification identifier.
 * @field title          - Notification title (typically sender or group name).
 * @field text           - Notification body text.
 * @field subText        - Notification sub-text or summary (nullable).
 * @field timestamp      - Unix epoch ms when notification event fired.
 * @field groupKey       - Notification group key for multi-message grouping (nullable).
 */
export interface RawNotificationPayload {
  packageName:    string;
  notificationId: number;
  title:          string;
  text:           string;
  subText:        string | null;
  timestamp:      number;
  groupKey:       string | null;
}

/**
 * Result produced by the ClassificationEngine for a single notification.
 *
 * @field classification  - Primary classification category.
 * @field confidence      - Confidence score between 0.0 and 1.0.
 * @field isDeletion      - True if this notification signals a message deletion.
 * @field isEdit          - True if this notification signals a message edit.
 * @field isSystemMessage - True if this is a WhatsApp system notification (not user message).
 * @field normalizedText  - Sanitized and normalized message text for storage.
 */
export interface ClassificationResult {
  classification:  NotificationClassification;
  confidence:      number;
  isDeletion:      boolean;
  isEdit:          boolean;
  isSystemMessage: boolean;
  normalizedText:  string | null;
}

/**
 * Classification categories for incoming WhatsApp notifications.
 */
export type NotificationClassification =
  | 'USER_MESSAGE'
  | 'DELETION_SIGNAL'
  | 'EDIT_SIGNAL'
  | 'SYSTEM_NOTICE'
  | 'OTP_SPAM'
  | 'GROUP_METADATA'
  | 'UNKNOWN';

/* =============================================================
   UI / Application State Types
   ============================================================= */

/**
 * Application-level authentication and session state.
 */
export interface AuthState {
  isAuthenticated:     boolean;
  isBiometricEnabled:  boolean;
  isPinEnabled:        boolean;
  sessionStartedAt:    number | null;
  sessionTimeoutMs:    number;
}

/**
 * Statistics summary displayed on the Landing Page dashboard.
 */
export interface AppStats {
  totalMessagesCaputred: number;
  totalDeletedRecovered: number;
  totalConversations:    number;
  totalContacts:         number;
  oldestCaptureTimestamp: number | null;
  storageSizeBytes:      number;
}

/**
 * Configuration settings persisted in encrypted preferences.
 */
export interface AppSettings {
  sessionTimeoutSeconds:  number;
  biometricEnabled:       boolean;
  pinEnabled:             boolean;
  screenSecureEnabled:    boolean;
  autoDeleteAfterDays:    number | null;
  notificationEnabled:    boolean;
  captureMediaEnabled:    boolean;
  spamFilterEnabled:      boolean;
}

/**
 * Navigation tab identifier for the Bottom Navigation Bar.
 */
export type NavTab = 'chats' | 'deleted' | 'settings';

/**
 * Toast notification severity levels for user feedback.
 */
export type ToastSeverity = 'info' | 'success' | 'warning' | 'error';

/**
 * In-app toast notification payload.
 */
export interface ToastMessage {
  id:       string;
  message:  string;
  severity: ToastSeverity;
  durationMs: number;
}
