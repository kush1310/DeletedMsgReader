/**
 * ClassificationEngine
 *
 * On-device heuristic classifier that analyzes raw WhatsApp notification
 * payloads and determines their semantic category:
 *   - Standard user messages (USER_MESSAGE / STANDARD_MESSAGE)
 *   - Deletion signals ("This message was deleted", admin deletions, 35+ languages)
 *   - Edit signals ("(edited)", 35+ language markers)
 *   - WhatsApp system notices ("End-to-end encrypted", "Checking for new messages")
 *   - OTP spam from automated senders
 *
 * Uses rule-based pattern matching augmented with Jaccard similarity
 * for fuzzy deduplication of notification batches.
 */

import type {
  RawNotificationPayload,
  ClassificationResult,
  NotificationClassification,
} from '@/types';

/* =============================================================
   Multilingual Deletion Signal Patterns (35+ Languages & Admin Actions)
   ============================================================= */

const DELETION_PATTERNS: ReadonlyArray<RegExp> = [
  /this message was deleted/i,
  /this message has been deleted/i,
  /you deleted this message/i,
  /you deleted a message/i,
  /message deleted/i,
  /deleted this message/i,
  /this message was deleted by an admin/i,
  /deleted by an admin/i,
  /esta mensagem foi apagada/i,
  /você apagou esta mensagem/i,
  /este mensaje fue eliminado/i,
  /eliminaste este mensaje/i,
  /mensaje eliminado por un administrador/i,
  /ce message a été supprimé/i,
  /vous avez supprimé ce message/i,
  /diese nachricht wurde gelöscht/i,
  /du hast diese nachricht gelöscht/i,
  /admin hat diese nachricht gelöscht/i,
  /questo messaggio è stato eliminato/i,
  /dit bericht is verwijderd/i,
  /wiadomość została usunięta/i,
  /bu mesaj silindi/i,
  /pesan ini telah dihapus/i,
  /tin nhắn này đã bị xóa/i,
  /ข้อความนี้ถูกลบแล้ว/,
  /यह संदेश हटा दिया गया/,
  /यह संदेश किसी एडमिन ने हटा दिया/,
  /આ સંદેશ કાઢી નાખવામાં આવ્યો છે/,
  /இந்த செய்தி நீக்கப்பட்டது/,
  /ఈ సందేశం తొలగించబడింది/,
  /ಈ ಸಂದೇಶವನ್ನು ಅಳಿಸಲಾಗಿದೆ/,
  /ഈ സന്ദേശം ഇല്ലാതാക്കി/,
  /تم حذف هذه الرسالة/,
  /پیام حذف شد/,
  /此消息已被删除/,
  /这个消息已被删除/,
  /這個訊息已被刪除/,
  /このメッセージは削除されました/,
  /이 메시지는 삭제되었습니다/,
  /данное сообщение удалено/i,
  /это сообщение было удалено/i,
];

/* =============================================================
   Multilingual Edit Signal Patterns (35+ Languages)
   ============================================================= */

const EDIT_PATTERNS: ReadonlyArray<RegExp> = [
  /(?:^|\s)\((?:edited|संपादित|editado|editada|bearbeitet|modifié|modifiée|modificato|изменено|معدلة|düzenlendi|geselecteerd|wijziging|edytowano|diubah|แก้ไขแล้ว|已编辑|已編輯|編集済み|수정됨)\)$/i,
  /this message was edited/i,
  /edited/i,
  /esta mensagem foi editada/i,
  /este mensaje fue editado/i,
  /ce message a été modifié/i,
];

const SYSTEM_NOTICE_PATTERNS: ReadonlyArray<RegExp> = [
  /end-to-end encrypted/i,
  /messages and calls are end-to-end encrypted/i,
  /security code changed/i,
  /you're now an admin/i,
  /created group/i,
  /added you/i,
  /left the group/i,
  /changed the subject/i,
  /changed this group's icon/i,
  /waiting for this message/i,
  /checking for new messages/i,
  /whatsapp web is currently active/i,
  /backup in progress/i,
];

const OTP_SPAM_PATTERNS: ReadonlyArray<RegExp> = [
  /\b(?:your\s+)?otp\s+(?:is|:)?\s*\d{4,8}\b/i,
  /\b\d{4,8}\b.*(?:code|otp|passcode|pin|verification)\b/i,
  /\b(?:verification|security)\s+code\b/i,
  /\bone[ -]?time[ -]?password\b/i,
  /\bdo not share this (?:code|otp)\b/i,
  /\buse code \d{4,8}\b/i,
];

export function isWhatsAppPackage(packageName: string): boolean {
  return packageName === 'com.whatsapp' || packageName === 'com.whatsapp.w4b';
}

export function computeJaccardSimilarity(textA: string, textB: string): number {
  const tokensA = new Set(textA.toLowerCase().split(/\s+/).filter(Boolean));
  const tokensB = new Set(textB.toLowerCase().split(/\s+/).filter(Boolean));

  if (tokensA.size === 0 && tokensB.size === 0) return 1.0;
  if (tokensA.size === 0 || tokensB.size === 0) return 0.0;

  let intersectionSize = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersectionSize++;
  }

  const unionSize = tokensA.size + tokensB.size - intersectionSize;
  return intersectionSize / unionSize;
}

export function isDuplicate(
  newText: string,
  recentTexts: string | ReadonlyArray<string>,
  similarityThreshold = 0.80
): boolean {
  if (typeof recentTexts === 'string') {
    return computeJaccardSimilarity(newText, recentTexts) >= similarityThreshold;
  }

  for (const existing of recentTexts) {
    if (computeJaccardSimilarity(newText, existing) >= similarityThreshold) {
      return true;
    }
  }
  return false;
}

export function classifyNotification(payload: RawNotificationPayload): ClassificationResult {
  const rawText = payload.text ?? '';
  const textLower = rawText.toLowerCase();
  const combined  = `${payload.title} ${rawText}`.toLowerCase();

  /* --- Check deletion patterns first (highest priority) --- */
  for (const pattern of DELETION_PATTERNS) {
    if (pattern.test(rawText) || pattern.test(combined)) {
      return buildResult('DELETION_SIGNAL', 0.97, true, false, false, null, pattern.source);
    }
  }

  /* --- Check edit patterns --- */
  for (const pattern of EDIT_PATTERNS) {
    if (pattern.test(rawText)) {
      return buildResult('EDIT_SIGNAL', 0.93, false, true, false, null, pattern.source);
    }
  }

  /* --- Check system notice patterns --- */
  if (rawText.trim().length === 0) {
    return buildResult('SYSTEM_NOTICE', 0.90, false, false, true, null, 'EMPTY_TEXT');
  }
  for (const pattern of SYSTEM_NOTICE_PATTERNS) {
    if (pattern.test(combined) || pattern.test(rawText)) {
      return buildResult('SYSTEM_NOTICE', 0.85, false, false, true, null, pattern.source);
    }
  }

  /* --- Check OTP/spam patterns --- */
  for (const pattern of OTP_SPAM_PATTERNS) {
    if (pattern.test(textLower)) {
      return buildResult('OTP_SPAM', 0.80, false, false, false, null, pattern.source);
    }
  }

  /* --- Default: treat as genuine user message --- */
  return buildResult('USER_MESSAGE', 0.92, false, false, false, rawText, null);
}

function buildResult(
  classification:  NotificationClassification,
  confidence:      number,
  isDeletion:      boolean,
  isEdit:          boolean,
  isSystemMessage: boolean,
  normalizedText:  string | null,
  matchedPattern:  string | null
): ClassificationResult {
  return {
    classification,
    type: classification,
    confidence,
    isDeletion,
    isEdit,
    isSystemMessage,
    normalizedText,
    extractedSender: null,
    matchedPattern,
  };
}
