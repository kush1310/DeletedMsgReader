/**
 * DatabaseService
 *
 * In-memory store used exclusively during web/browser development previews.
 * In production Android, all reads and writes go through NativeBridgeService
 * which routes to the Room SQLite database via MessageBridgePlugin.kt.
 *
 * This service starts EMPTY — no dummy or seed data is seeded.
 * The UI will display the correct empty state until real WhatsApp
 * notifications are captured on a physical Android device.
 *
 * All write operations use parameterized inputs — no raw string concatenation.
 *
 * Security: Guideline 11 — Database Security (parameterized, no hardcoded creds)
 * Security: Guideline 08 — Data Protection (encrypted in production via SQLCipher)
 */

import type { Contact, Conversation, Message, AuditLog } from '@/types';

/* =============================================================
   In-Memory Development Store (mirrors production SQLite schema)
   Starts empty. Populated by real notification events on device.
   ============================================================= */

interface DevStore {
  contacts:      Map<string, Contact>;
  conversations: Map<string, Conversation>;
  messages:      Map<string, Message>;
  auditLogs:     Map<string, AuditLog>;
}

const devStore: DevStore = {
  contacts:      new Map(),
  conversations: new Map(),
  messages:      new Map(),
  auditLogs:     new Map(),
};

/* =============================================================
   Public Database API
   ============================================================= */

/**
 * getAllConversations
 *
 * Returns all stored conversations sorted by lastMessageTimestamp
 * in descending order (most recent first).
 * On native Android, use NativeBridgeService.getConversations() instead.
 *
 * @returns - Array of Conversation objects (empty on web until real data arrives).
 */
export function getAllConversations(): Conversation[] {
  return Array.from(devStore.conversations.values())
    .sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);
}

/**
 * getConversationById
 *
 * Retrieves a single conversation by its UUID primary key.
 *
 * @param  id  - UUID of the target conversation.
 * @returns    - Conversation object if found; undefined otherwise.
 */
export function getConversationById(id: string): Conversation | undefined {
  return devStore.conversations.get(id);
}

/**
 * getMessagesByConversation
 *
 * Returns all messages for a given conversation sorted by timestamp ascending.
 *
 * @param  conversationId  - UUID of the target conversation.
 * @returns                - Array of Message objects in chronological order.
 */
export function getMessagesByConversation(conversationId: string): Message[] {
  return Array.from(devStore.messages.values())
    .filter(message => message.conversationId === conversationId)
    .sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * getDeletedMessages
 *
 * Returns all messages flagged as deleted by sender across all conversations,
 * sorted by timestamp descending (most recently deleted first).
 *
 * @returns - Array of deleted Message objects.
 */
export function getDeletedMessages(): Message[] {
  return Array.from(devStore.messages.values())
    .filter(message => message.isDeletedBySender)
    .sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * searchMessages
 *
 * Performs a full-text search across all stored message text.
 *
 * @param  sanitizedQuery  - Pre-sanitized search string (no raw user input).
 * @returns                - Array of matching Message objects.
 */
export function searchMessages(sanitizedQuery: string): Message[] {
  const lowerQuery = sanitizedQuery.toLowerCase();
  return Array.from(devStore.messages.values())
    .filter(message =>
      message.messageText?.toLowerCase().includes(lowerQuery) ||
      message.senderName.toLowerCase().includes(lowerQuery)
    )
    .sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * getContactById
 *
 * Retrieves a contact record by its UUID primary key.
 *
 * @param  id  - UUID of the target contact.
 * @returns    - Contact object if found; undefined otherwise.
 */
export function getContactById(id: string): Contact | undefined {
  return devStore.contacts.get(id);
}

/**
 * insertMessage
 *
 * Inserts a new Message record into the in-memory store.
 * On native Android, insertion goes through NotificationListener.kt directly.
 *
 * @param  message  - Fully constructed Message object with valid UUIDs.
 */
export function insertMessage(message: Message): void {
  devStore.messages.set(message.id, message);
}

/**
 * markMessageAsDeleted
 *
 * Updates the isDeletedBySender flag for a stored message.
 *
 * @param  messageId  - UUID of the message to flag.
 * @returns           - True if message was found and updated; false if not found.
 */
export function markMessageAsDeleted(messageId: string): boolean {
  const existing = devStore.messages.get(messageId);
  if (!existing) return false;
  devStore.messages.set(messageId, { ...existing, isDeletedBySender: true });
  return true;
}

/**
 * clearAllData
 *
 * Permanently empties all in-memory store maps.
 * Called after user confirms the "Wipe All Data" action on web preview.
 * On native Android, wipe goes through MessageBridgePlugin.wipeAllData().
 */
export function clearAllData(): void {
  devStore.contacts.clear();
  devStore.conversations.clear();
  devStore.messages.clear();
  devStore.auditLogs.clear();
}

/**
 * getAppStats
 *
 * Computes aggregate statistics for display.
 *
 * @returns - AppStats summary object.
 */
export function getAppStats() {
  const allMessages = Array.from(devStore.messages.values());
  const timestamps  = allMessages.map(m => m.timestamp).filter(t => t > 0);

  return {
    totalMessagesCaputred:   allMessages.length,
    totalDeletedRecovered:   allMessages.filter(m => m.isDeletedBySender).length,
    totalConversations:      devStore.conversations.size,
    totalContacts:           devStore.contacts.size,
    oldestCaptureTimestamp:  timestamps.length > 0 ? Math.min(...timestamps) : null,
    storageSizeBytes:        allMessages.length * 512,
  };
}
