/**
 * ClassificationEngine
 *
 * On-device heuristic classifier that analyzes raw WhatsApp notification
 * payloads and determines their semantic category:
 *   - Standard user messages
 *   - Deletion signals ("This message was deleted")
 *   - Edit signals ("This message was edited")
 *   - WhatsApp system notices
 *   - OTP spam from automated senders
 *   - Group metadata events
 *
 * Uses rule-based pattern matching augmented with Jaccard similarity
 * for fuzzy deduplication of notification batches.
 *
 * ML domain: on-device lightweight rule/heuristic classifier with similarity
 * matching — no external network calls or model weights required.
 */

import type {
  RawNotificationPayload,
  ClassificationResult,
  NotificationClassification,
} from '@/types';

/* =============================================================
   Deletion Signal Patterns
   ============================================================= */

/**
 * Known WhatsApp deletion notification text patterns across major languages.
 * WhatsApp replaces deleted message text with these system strings.
 * Multilingual support ensures international users are covered.
 */
const DELETION_PATTERNS: ReadonlyArray<RegExp> = [
  /this message was deleted/i,
  /you deleted this message/i,
  /message deleted/i,
  /* Portuguese */
  /esta mensagem foi apagada/i,
  /* Spanish */
  /este mensaje fue eliminado/i,
  /* Hindi */
  /यह संदेश हटा दिया गया/,
  /* French */
  /ce message a été supprimé/i,
  /* German */
  /diese nachricht wurde gelöscht/i,
  /* Arabic */
  /تم حذف هذه الرسالة/,
];

/**
 * Known WhatsApp edit notification text patterns.
 */
const EDIT_PATTERNS: ReadonlyArray<RegExp> = [
  /this message was edited/i,
  /edited/i,
  /* Portuguese */
  /esta mensagem foi editada/i,
  /* Spanish */
  /este mensaje fue editado/i,
];

/**
 * WhatsApp system background notice patterns.
 * These notifications carry no user message content.
 */
const SYSTEM_NOTICE_PATTERNS: ReadonlyArray<RegExp> = [
  /checking for new messages/i,
  /you may have new messages/i,
  /tap to check/i,
  /end-to-end encrypted/i,
  /security code changed/i,
  /added you/i,
  /changed the group/i,
  /changed the subject/i,
  /created group/i,
  /left/i,
  /was added/i,
  /joined using this group/i,
];

/**
 * OTP and automated spam notification patterns.
 * These are high-frequency automated notifications with no recovery value.
 */
const OTP_SPAM_PATTERNS: ReadonlyArray<RegExp> = [
  /\b\d{4,8}\b.*\bcode\b/i,
  /\bverification code\b/i,
  /\botp\b/i,
  /\bone.time\b/i,
  /\bpassword.*\d{4,8}/i,
  /\b\d{4,8}.*\bpassword\b/i,
];

/* =============================================================
   Jaccard Similarity for Deduplication
   ============================================================= */

/**
 * computeJaccardSimilarity
 *
 * Computes word-level Jaccard similarity between two text strings
 * to detect duplicate or near-duplicate notification batches.
 * Used to prevent the same WhatsApp message from being stored
 * multiple times when notification updates arrive in quick succession.
 *
 * @param  textA  - First string for comparison.
 * @param  textB  - Second string for comparison.
 * @returns       - Similarity score between 0.0 (disjoint) and 1.0 (identical).
 */
export function computeJaccardSimilarity(textA: string, textB: string): number {
  const wordsA = new Set(textA.toLowerCase().split(/\s+/).filter(w => w.length > 0));
  const wordsB = new Set(textB.toLowerCase().split(/\s+/).filter(w => w.length > 0));

  if (wordsA.size === 0 && wordsB.size === 0) return 1.0;
  if (wordsA.size === 0 || wordsB.size === 0) return 0.0;

  let intersectionSize = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersectionSize++;
  }

  const unionSize = wordsA.size + wordsB.size - intersectionSize;
  return intersectionSize / unionSize;
}

/**
 * isDuplicate
 *
 * Returns true if two notification text strings are sufficiently similar
 * to be considered the same message (Jaccard similarity >= 0.85).
 *
 * @param  textA       - Existing stored message text.
 * @param  textB       - Incoming notification text.
 * @param  threshold   - Similarity threshold (default 0.85).
 * @returns            - True if duplicate, false if distinct message.
 */
export function isDuplicate(textA: string, textB: string, threshold = 0.85): boolean {
  return computeJaccardSimilarity(textA, textB) >= threshold;
}

/* =============================================================
   Core Classification Logic
   ============================================================= */

/**
 * classifyNotification
 *
 * Primary classification function. Evaluates a raw Android notification
 * payload against all pattern sets and returns a structured result
 * containing the classification category, confidence score, and
 * semantic flags for deletion/edit/system status.
 *
 * Classification priority order:
 *   1. Deletion signal (highest priority — must never be missed)
 *   2. Edit signal
 *   3. System notice
 *   4. OTP spam
 *   5. User message (default)
 *
 * @param  payload  - Validated raw notification payload from Android bridge.
 * @returns         - ClassificationResult with category, confidence, and flags.
 * @edge-cases      - Empty text defaults to SYSTEM_NOTICE classification.
 *                   Non-WhatsApp packages should be filtered before reaching this function.
 */
export function classifyNotification(payload: RawNotificationPayload): ClassificationResult {
  const textLower = payload.text.toLowerCase();
  const combined  = `${payload.title} ${payload.text}`.toLowerCase();

  /* --- Check deletion patterns first (highest priority) --- */
  for (const pattern of DELETION_PATTERNS) {
    if (pattern.test(payload.text)) {
      return buildResult('DELETION_SIGNAL', 0.97, true,  false, false, null);
    }
  }

  /* --- Check edit patterns --- */
  for (const pattern of EDIT_PATTERNS) {
    if (pattern.test(payload.text)) {
      return buildResult('EDIT_SIGNAL', 0.93, false, true, false, null);
    }
  }

  /* --- Check system notice patterns --- */
  if (payload.text.trim().length === 0) {
    return buildResult('SYSTEM_NOTICE', 0.90, false, false, true, null);
  }
  for (const pattern of SYSTEM_NOTICE_PATTERNS) {
    if (pattern.test(combined)) {
      return buildResult('SYSTEM_NOTICE', 0.85, false, false, true, null);
    }
  }

  /* --- Check OTP/spam patterns --- */
  for (const pattern of OTP_SPAM_PATTERNS) {
    if (pattern.test(textLower)) {
      return buildResult('OTP_SPAM', 0.80, false, false, false, null);
    }
  }

  /* --- Default: treat as genuine user message --- */
  return buildResult('USER_MESSAGE', 0.92, false, false, false, payload.text);
}

/**
 * buildResult
 *
 * Internal factory function that constructs a ClassificationResult object
 * with all fields explicitly assigned.
 *
 * @param  classification  - Notification classification category.
 * @param  confidence      - Confidence score (0.0 – 1.0).
 * @param  isDeletion      - True if deletion signal detected.
 * @param  isEdit          - True if edit signal detected.
 * @param  isSystemMessage - True if system/background notice.
 * @param  normalizedText  - Sanitized text for storage, or null for non-messages.
 * @returns                - Fully populated ClassificationResult.
 */
function buildResult(
  classification:  NotificationClassification,
  confidence:      number,
  isDeletion:      boolean,
  isEdit:          boolean,
  isSystemMessage: boolean,
  normalizedText:  string | null,
): ClassificationResult {
  return {
    classification,
    confidence,
    isDeletion,
    isEdit,
    isSystemMessage,
    normalizedText,
  };
}

/**
 * isWhatsAppPackage
 *
 * Guard function to verify that a notification originates from a known
 * WhatsApp package before passing it to the classifier.
 *
 * @param  packageName  - Android package name from notification.
 * @returns             - True if this is a WhatsApp-family application.
 */
export function isWhatsAppPackage(packageName: string): boolean {
  return packageName === 'com.whatsapp' || packageName === 'com.whatsapp.w4b';
}
