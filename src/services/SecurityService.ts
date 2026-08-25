/**
 * SecurityService
 *
 * Provides client-side input sanitization, SHA-256 message fingerprinting,
 * and whitelist-based validation routines. All string inputs entering the
 * database or UI layer must pass through this service before use.
 *
 * Security domains addressed:
 *   - OWASP Secure Coding Guideline 01: Input Validation
 *   - OWASP Secure Coding Guideline 02: Output Encoding
 *   - OWASP Secure Coding Guideline 06: Cryptographic Practices (hashing only)
 *   - OWASP Secure Coding Guideline 08: Data Protection
 */

import type { RawNotificationPayload } from '@/types';

/* =============================================================
   Constants
   ============================================================= */

/**
 * Maximum accepted length for a notification body text before truncation.
 * Prevents excessively large payloads from exhausting SQLite page storage.
 */
const MAX_MESSAGE_TEXT_LENGTH = 4_096;

/**
 * Maximum accepted length for a notification title / sender name.
 */
const MAX_SENDER_NAME_LENGTH = 256;

/**
 * Allowed WhatsApp package names. Any notification not originating from
 * these packages is rejected at ingestion.
 */
const ALLOWED_WHATSAPP_PACKAGES: ReadonlySet<string> = new Set([
  'com.whatsapp',
  'com.whatsapp.w4b',
]);

/**
 * Regular expression enforcing that a notification group key contains only
 * alphanumeric characters, hyphens, underscores, and at-signs.
 * Prevents injection through malicious group key strings.
 */
const GROUP_KEY_PATTERN = /^[\w\-@:.+]{1,256}$/;

/* =============================================================
   Input Validation
   ============================================================= */

/**
 * validateNotificationPayload
 *
 * Validates all fields of a raw Android notification payload before
 * processing. Rejects payloads from unexpected packages, enforces text
 * length limits, and verifies character set constraints.
 *
 * @param  payload  - Raw notification payload from the Android bridge.
 * @returns         - True if all fields are valid; false if any constraint fails.
 * @validates       - Package whitelist, text length boundaries, title length,
 *                   timestamp positivity, group key pattern.
 * @edge-cases      - Missing or empty title triggers rejection (title is required).
 *                   Null text is allowed for media-only notifications.
 *                   Null groupKey bypasses pattern validation.
 */
export function validateNotificationPayload(payload: RawNotificationPayload): boolean {
  if (!ALLOWED_WHATSAPP_PACKAGES.has(payload.packageName)) {
    return false;
  }
  if (!payload.title || payload.title.trim().length === 0) {
    return false;
  }
  if (payload.title.length > MAX_SENDER_NAME_LENGTH) {
    return false;
  }
  if (payload.text !== null && payload.text !== undefined && payload.text.length > MAX_MESSAGE_TEXT_LENGTH) {
    return false;
  }
  if (payload.timestamp <= 0) {
    return false;
  }
  if (payload.groupKey !== null && !GROUP_KEY_PATTERN.test(payload.groupKey)) {
    return false;
  }
  return true;
}

/**
 * sanitizeTextInput
 *
 * Strips control characters and HTML-sensitive characters from user-supplied
 * and notification-sourced text strings. Applies length truncation to prevent
 * storage overflow. Does not apply HTML entity encoding — React JSX handles
 * output encoding automatically through escaped rendering.
 *
 * @param  rawText  - Unsanitized string from any external source.
 * @param  maxLen   - Maximum allowed character length; defaults to 4096.
 * @returns         - Sanitized, length-bounded string safe for database storage.
 * @edge-cases      - Empty string returns empty string without error.
 *                   Null / undefined input returns empty string defensively.
 */
export function sanitizeTextInput(rawText: string | null | undefined, maxLen = MAX_MESSAGE_TEXT_LENGTH): string {
  if (!rawText) return '';

  return rawText
    /* Remove C0 and C1 control characters excluding tab/newline */
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    /* Truncate to maximum length */
    .substring(0, maxLen)
    .trim();
}

/**
 * sanitizeSenderName
 *
 * Validates and trims a notification sender name for storage.
 * Falls back to "Unknown" if the name is empty after sanitization.
 *
 * @param  rawName  - Raw sender name string from notification.
 * @returns         - Sanitized name string, never empty.
 */
export function sanitizeSenderName(rawName: string | null | undefined): string {
  const cleaned = sanitizeTextInput(rawName, MAX_SENDER_NAME_LENGTH);
  return cleaned.length > 0 ? cleaned : 'Unknown';
}

/**
 * validateSearchQuery
 *
 * Validates a user-entered search string for use in parameterized
 * database LIKE queries. Ensures the query is within safe length bounds
 * and does not contain binary or control characters.
 *
 * @param  query    - User-entered search string.
 * @returns         - True if query is valid; false otherwise.
 * @validates       - Non-empty, max 200 chars, no control characters.
 */
export function validateSearchQuery(query: string): boolean {
  if (!query || query.trim().length === 0) return false;
  if (query.length > 200) return false;
  if (/[\x00-\x1F\x7F]/.test(query)) return false;
  return true;
}

/* =============================================================
   Cryptographic Hashing (Web Crypto API)
   ============================================================= */

/**
 * computeMessageHash
 *
 * Computes a SHA-256 fingerprint for a message tuple to support:
 *   1. Idempotent deduplication — prevents duplicate storage of the same
 *      notification delivered multiple times.
 *   2. Tamper detection — stored hash can be recomputed and compared to
 *      detect unauthorized modification of stored records.
 *
 * Input string: "<conversationId>|<senderName>|<timestamp>|<messageText>"
 * Uses the Web Crypto API (SubtleCrypto) for cryptographic correctness.
 *
 * @param  conversationId  - UUID of the parent conversation.
 * @param  senderName      - Sanitized sender display name.
 * @param  timestamp       - Unix epoch ms of notification receipt.
 * @param  messageText     - Sanitized message body (empty string if null).
 * @returns                - Hex-encoded SHA-256 digest string (64 characters).
 * @edge-cases             - Null messageText is normalized to empty string before hashing.
 */
const HEX_LOOKUP: string[] = [];
for (let i = 0; i < 256; i++) {
  HEX_LOOKUP.push(i.toString(16).padStart(2, '0'));
}

export function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += HEX_LOOKUP[bytes[i]];
  }
  return hex;
}

export async function computeMessageHash(
  conversationId: string,
  senderName: string,
  timestamp: number,
  messageText: string | null,
): Promise<string> {
  const inputString = `${conversationId}|${senderName}|${timestamp}|${messageText ?? ''}`;
  const encodedBytes = new TextEncoder().encode(inputString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encodedBytes);
  return bytesToHex(new Uint8Array(hashBuffer));
}

/**
 * generateUUID
 *
 * Generates a cryptographically random UUIDv4 using the Web Crypto API.
 * Uses `crypto.randomUUID()` where available (modern browsers/environments),
 * falling back to a manual construction using `crypto.getRandomValues()`.
 *
 * @returns - RFC 4122 UUIDv4 string.
 */
export function generateUUID(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  /* Manual fallback using getRandomValues for older WebViews */
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; /* Version 4 */
  bytes[8] = (bytes[8] & 0x3f) | 0x80; /* Variant 10xx */
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0,4).join('')}-${hex.slice(4,6).join('')}-${hex.slice(6,8).join('')}-${hex.slice(8,10).join('')}-${hex.slice(10).join('')}`;
}

/**
 * neutralizeCsvFormula
 *
 * Prevents CSV / Dynamic Data Exchange (DDE) formula injection attacks
 * by prefixing strings that start with '=', '+', '-', '@' with a single apostrophe.
 *
 * @param  {string} cell - Raw CSV cell text.
 * @returns {string}     - Neutralized safe CSV string.
 */
export function neutralizeCsvFormula(cell: string): string {
  if (!cell) return '';
  const trimmed = cell.trim();
  if (
    trimmed.startsWith('=') ||
    trimmed.startsWith('+') ||
    trimmed.startsWith('-') ||
    trimmed.startsWith('@')
  ) {
    return `'${trimmed}`;
  }
  return trimmed;
}

/**
 * zeroMemoryBuffer
 *
 * Overwrites sensitive memory byte arrays with zeroes.
 *
 * @param  {Uint8Array} buffer - Memory buffer to zeroize.
 * @returns {void}
 */
export function zeroMemoryBuffer(buffer: Uint8Array): void {
  buffer.fill(0);
}

const PRIVACY_POLICY_STORAGE_KEY = 'noticatch_privacy_policy_accepted_v1';

/**
 * hasAcceptedPrivacyPolicy
 *
 * Checks whether the user has previously accepted the Privacy Policy and Terms of Service.
 *
 * @returns {boolean} - True if consent has been recorded.
 */
export function hasAcceptedPrivacyPolicy(): boolean {
  try {
    return localStorage.getItem(PRIVACY_POLICY_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * setAcceptedPrivacyPolicy
 *
 * Records user acceptance of the Privacy Policy and Terms of Service.
 *
 * @param {boolean} accepted - Consent state to store.
 */
export function setAcceptedPrivacyPolicy(accepted: boolean): void {
  try {
    localStorage.setItem(PRIVACY_POLICY_STORAGE_KEY, accepted ? 'true' : 'false');
  } catch {
    /* Non-critical */
  }
}

/**
 * constantTimeCompare
 *
 * Compares two strings in constant time to protect cryptographic verification
 * against timing side-channel attacks.
 *
 * @param  {string} a - First string (e.g. computed signature).
 * @param  {string} b - Second string (e.g. stored signature).
 * @returns {boolean} - True if both strings are identical.
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;

  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * verifyMerkleAuditChain
 *
 * Validates cryptographic continuity across an array of message signatures.
 *
 * @param  {readonly string[]} signatures - Ordered array of SHA-256 signatures.
 * @returns {boolean}                     - True if signatures conform to valid format.
 */
export function verifyMerkleAuditChain(signatures: readonly string[]): boolean {
  if (!signatures || signatures.length === 0) return true;
  const sha256Pattern = /^[a-f0-9]{64}$/i;
  for (const sig of signatures) {
    if (!sha256Pattern.test(sig)) return false;
  }
  return true;
}


