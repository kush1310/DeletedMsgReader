/**
 * DatabaseService
 *
 * In-browser SQLite abstraction layer using the browser's IndexedDB or
 * an in-memory store for the web preview environment. In production Android,
 * this is replaced by the SQLCipher-backed Room database accessed via the
 * Capacitor native bridge.
 *
 * On web/desktop (dev mode): uses a structured in-memory store that mirrors
 * the full relational schema to allow complete UI development and testing
 * without an Android device.
 *
 * All read and write operations use parameterized inputs — no raw string
 * concatenation is used anywhere in this service.
 *
 * Security domains:
 *   - Guideline 11: Database Security (parameterized queries, no hardcoded credentials)
 *   - Guideline 08: Data Protection (encrypted in production via SQLCipher bridge)
 */

import type { Contact, Conversation, Message, AuditLog, AppStats } from '@/types';
import { generateUUID } from '@/services/SecurityService';

/* =============================================================
   In-Memory Development Store (mirrors production SQLite schema)
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
   Seed Data for Development Preview
   ============================================================= */

/**
 * seedDevelopmentData
 *
 * Populates the in-memory development store with realistic sample data
 * so the UI can be fully previewed without a connected Android device.
 * All seed data is fictional and contains no real personal information.
 */
export function seedDevelopmentData(): void {
  const contactAlice  = createSeedContact('alice',  'Alice Sharma',    '919876543210@s.whatsapp.net');
  const contactBob    = createSeedContact('bob',    'Bob Mehta',       '917654321098@s.whatsapp.net');
  const contactFamily = createSeedContact('family', 'Family Group',    'family-123456789@g.us');

  devStore.contacts.set(contactAlice.id,  contactAlice);
  devStore.contacts.set(contactBob.id,    contactBob);
  devStore.contacts.set(contactFamily.id, contactFamily);

  const convoAlice  = createSeedConvo(contactAlice.id,  'Alice Sharma',  false, 2, 1);
  const convoBob    = createSeedConvo(contactBob.id,    'Bob Mehta',     false, 0, 0);
  const convoFamily = createSeedConvo(contactFamily.id, 'Family Group',  true,  5, 3);

  devStore.conversations.set(convoAlice.id,  convoAlice);
  devStore.conversations.set(convoBob.id,    convoBob);
  devStore.conversations.set(convoFamily.id, convoFamily);

  /* Alice's messages — including one deleted message */
  const now = Date.now();
  const messages: Message[] = [
    buildMsg(convoAlice.id,  'Alice Sharma', 'Hey! Are you free tomorrow?',              now - 7_200_000, false, false),
    buildMsg(convoAlice.id,  'Alice Sharma', null,                                        now - 7_100_000, true,  false), /* deleted */
    buildMsg(convoAlice.id,  'Alice Sharma', 'Actually, never mind. See you at 6 PM.',   now - 3_600_000, false, false),
    buildMsg(convoBob.id,    'Bob Mehta',    'Did you see the match last night?',         now - 86_400_000, false, false),
    buildMsg(convoBob.id,    'Bob Mehta',    'Incredible finish.',                        now - 85_000_000, false, false),
    buildMsg(convoFamily.id, 'Mom',          'Everyone coming for dinner on Sunday?',     now - 172_800_000, false, false),
    buildMsg(convoFamily.id, 'Dad',          null,                                        now - 170_000_000, true,  false), /* deleted */
    buildMsg(convoFamily.id, 'Brother',      null,                                        now - 168_000_000, true,  false), /* deleted */
    buildMsg(convoFamily.id, 'Mom',          'Let me know early please.',                 now - 100_000_000, false, false),
  ];

  for (const message of messages) {
    devStore.messages.set(message.id, message);
  }
}

/* Seed helpers */
function createSeedContact(idSuffix: string, displayName: string, jid: string): Contact {
  return {
    id:          `contact-${idSuffix}`,
    jid,
    displayName,
    avatarUri:   null,
    createdAt:   Date.now() - 1_000_000,
    updatedAt:   Date.now(),
  };
}

function createSeedConvo(contactId: string, chatTitle: string, isGroup: boolean, unread: number, deleted: number): Conversation {
  return {
    id:                   generateUUID(),
    contactId,
    chatTitle,
    isGroup,
    unreadCount:          unread,
    lastMessageTimestamp: Date.now() - Math.floor(Math.random() * 10_000_000),
    deletedCount:         deleted,
  };
}

function buildMsg(
  conversationId: string,
  senderName: string,
  messageText: string | null,
  timestamp: number,
  isDeletedBySender: boolean,
  isEdited: boolean,
): Message {
  return {
    id:                generateUUID(),
    conversationId,
    senderName,
    messageText,
    notificationId:    Math.floor(Math.random() * 999_999),
    timestamp,
    isDeletedBySender,
    isEdited,
    mediaType:         null,
    mediaPath:         null,
    hashSignature:     'seed-hash-' + generateUUID(),
  };
}

/* =============================================================
   Public Database API
   ============================================================= */

/**
 * getAllConversations
 *
 * Returns all stored conversations sorted by lastMessageTimestamp
 * in descending order (most recent first). In production, this executes:
 *   SELECT * FROM conversations ORDER BY last_message_timestamp DESC
 *
 * @returns - Array of Conversation objects.
 */
export function getAllConversations(): Conversation[] {
  return Array.from(devStore.conversations.values())
    .sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);
}

/**
 * getConversationById
 *
 * Retrieves a single conversation by its UUID primary key.
 * In production: SELECT * FROM conversations WHERE id = ? (parameterized).
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
 * In production:
 *   SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC
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
 * In production:
 *   SELECT * FROM messages WHERE is_deleted_by_sender = 1 ORDER BY timestamp DESC
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
 * Performs a full-text search across all stored message text using a
 * sanitized search query. In production, this uses:
 *   SELECT * FROM messages WHERE message_text LIKE ? (parameterized)
 * with the query pre-sanitized by SecurityService.
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
 * Inserts a new Message record into the store. In production, uses
 * a prepared INSERT statement via SQLCipher with all fields parameterized.
 *
 * @param  message  - Fully constructed Message object with valid UUIDs.
 */
export function insertMessage(message: Message): void {
  devStore.messages.set(message.id, message);
}

/**
 * markMessageAsDeleted
 *
 * Updates the is_deleted_by_sender flag for a stored message when a
 * WhatsApp deletion notification is received matching its signature.
 * In production:
 *   UPDATE messages SET is_deleted_by_sender = 1 WHERE id = ? (parameterized)
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
 * getAppStats
 *
 * Computes aggregate statistics for the Landing Page dashboard.
 * In production, these are pre-computed with indexed aggregate queries.
 *
 * @returns - AppStats summary object.
 */
export function getAppStats(): AppStats {
  const allMessages = Array.from(devStore.messages.values());
  const timestamps  = allMessages.map(m => m.timestamp).filter(t => t > 0);

  return {
    totalMessagesCaputred:   allMessages.length,
    totalDeletedRecovered:   allMessages.filter(m => m.isDeletedBySender).length,
    totalConversations:      devStore.conversations.size,
    totalContacts:           devStore.contacts.size,
    oldestCaptureTimestamp:  timestamps.length > 0 ? Math.min(...timestamps) : null,
    storageSizeBytes:        allMessages.length * 512, /* Rough estimate for UI display */
  };
}
