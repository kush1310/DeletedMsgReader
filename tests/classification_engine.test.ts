/**
 * classification_engine.test.ts
 *
 * Comprehensive test suite for the ClassificationEngine.
 * Validates that all deletion/edit/system/spam patterns are correctly
 * identified across English and multilingual notification strings.
 * Also validates the Jaccard similarity deduplication logic.
 */

import { describe, it, expect } from 'vitest';
import {
  classifyNotification,
  computeJaccardSimilarity,
  isDuplicate,
  isWhatsAppPackage,
} from '@/services/ClassificationEngine';
import type { RawNotificationPayload } from '@/types';

/* =============================================================
   Test Helpers
   ============================================================= */

function buildPayload(text: string, title = 'Alice', pkg = 'com.whatsapp'): RawNotificationPayload {
  return {
    packageName:    pkg,
    notificationId: 12345,
    title,
    text,
    subText:        null,
    timestamp:      Date.now(),
    groupKey:       null,
  };
}

/* =============================================================
   Deletion Signal Detection
   ============================================================= */

describe('ClassificationEngine — Deletion Signal Detection', () => {
  it('classifies English deletion notification correctly', () => {
    const result = classifyNotification(buildPayload('This message was deleted'));
    expect(result.classification).toBe('DELETION_SIGNAL');
    expect(result.isDeletion).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.90);
  });

  it('classifies case-insensitive deletion: "this message was deleted"', () => {
    const result = classifyNotification(buildPayload('this message was deleted'));
    expect(result.classification).toBe('DELETION_SIGNAL');
    expect(result.isDeletion).toBe(true);
  });

  it('classifies "You deleted this message" correctly', () => {
    const result = classifyNotification(buildPayload('You deleted this message'));
    expect(result.classification).toBe('DELETION_SIGNAL');
    expect(result.isDeletion).toBe(true);
  });

  it('classifies Portuguese deletion notification correctly', () => {
    const result = classifyNotification(buildPayload('Esta mensagem foi apagada'));
    expect(result.classification).toBe('DELETION_SIGNAL');
    expect(result.isDeletion).toBe(true);
  });

  it('classifies Spanish deletion notification correctly', () => {
    const result = classifyNotification(buildPayload('Este mensaje fue eliminado'));
    expect(result.classification).toBe('DELETION_SIGNAL');
    expect(result.isDeletion).toBe(true);
  });

  it('classifies French deletion notification correctly', () => {
    const result = classifyNotification(buildPayload('Ce message a été supprimé'));
    expect(result.classification).toBe('DELETION_SIGNAL');
    expect(result.isDeletion).toBe(true);
  });

  it('classifies German deletion notification correctly', () => {
    const result = classifyNotification(buildPayload('Diese Nachricht wurde gelöscht'));
    expect(result.classification).toBe('DELETION_SIGNAL');
    expect(result.isDeletion).toBe(true);
  });

  it('classifies Hindi deletion notification correctly', () => {
    const result = classifyNotification(buildPayload('यह संदेश हटा दिया गया'));
    expect(result.classification).toBe('DELETION_SIGNAL');
    expect(result.isDeletion).toBe(true);
  });

  it('classifies Gujarati deletion notification correctly', () => {
    const result = classifyNotification(buildPayload('આ સંદેશ કાઢી નાખવામાં આવ્યો છે'));
    expect(result.classification).toBe('DELETION_SIGNAL');
    expect(result.isDeletion).toBe(true);
  });

  it('classifies Arabic deletion notification correctly', () => {
    const result = classifyNotification(buildPayload('تم حذف هذه الرسالة'));
    expect(result.classification).toBe('DELETION_SIGNAL');
    expect(result.isDeletion).toBe(true);
  });

  it('classifies Admin deletion notification correctly', () => {
    const result = classifyNotification(buildPayload('This message was deleted by an admin'));
    expect(result.classification).toBe('DELETION_SIGNAL');
    expect(result.isDeletion).toBe(true);
  });

  it('classifies German admin deletion correctly', () => {
    const result = classifyNotification(buildPayload('Admin hat diese Nachricht gelöscht'));
    expect(result.classification).toBe('DELETION_SIGNAL');
    expect(result.isDeletion).toBe(true);
  });

  it('deletion signal sets isDeletion=true, isEdit=false, isSystemMessage=false', () => {
    const result = classifyNotification(buildPayload('This message was deleted'));
    expect(result.isDeletion).toBe(true);
    expect(result.isEdit).toBe(false);
    expect(result.isSystemMessage).toBe(false);
  });

  it('deletion signal returns null normalizedText', () => {
    const result = classifyNotification(buildPayload('This message was deleted'));
    expect(result.normalizedText).toBeNull();
  });
});

/* =============================================================
   Edit Signal Detection
   ============================================================= */

describe('ClassificationEngine — Edit Signal Detection', () => {
  it('classifies English edit notification correctly', () => {
    const result = classifyNotification(buildPayload('This message was edited'));
    expect(result.classification).toBe('EDIT_SIGNAL');
    expect(result.isEdit).toBe(true);
    expect(result.isDeletion).toBe(false);
  });

  it('classifies English suffix edit correctly: "Meeting at 5pm (edited)"', () => {
    const result = classifyNotification(buildPayload('Meeting at 5pm (edited)'));
    expect(result.classification).toBe('EDIT_SIGNAL');
    expect(result.isEdit).toBe(true);
  });

  it('classifies Hindi suffix edit correctly: "कल मिलते हैं (संपादित)"', () => {
    const result = classifyNotification(buildPayload('कल मिलते हैं (संपादित)'));
    expect(result.classification).toBe('EDIT_SIGNAL');
    expect(result.isEdit).toBe(true);
  });

  it('classifies Spanish suffix edit correctly: "Nos vemos mañana (editado)"', () => {
    const result = classifyNotification(buildPayload('Nos vemos mañana (editado)'));
    expect(result.classification).toBe('EDIT_SIGNAL');
    expect(result.isEdit).toBe(true);
  });

  it('classifies French suffix edit correctly: "Rendez-vous à 14h (modifié)"', () => {
    const result = classifyNotification(buildPayload('Rendez-vous à 14h (modifié)'));
    expect(result.classification).toBe('EDIT_SIGNAL');
    expect(result.isEdit).toBe(true);
  });

  it('edit signal returns null normalizedText', () => {
    const result = classifyNotification(buildPayload('This message was edited'));
    expect(result.normalizedText).toBeNull();
  });
});

/* =============================================================
   System Notice Detection
   ============================================================= */

describe('ClassificationEngine — System Notice Detection', () => {
  it('classifies empty text as SYSTEM_NOTICE', () => {
    const result = classifyNotification(buildPayload(''));
    expect(result.classification).toBe('SYSTEM_NOTICE');
    expect(result.isSystemMessage).toBe(true);
  });

  it('classifies "Checking for new messages" as SYSTEM_NOTICE', () => {
    const result = classifyNotification(buildPayload('Checking for new messages'));
    expect(result.classification).toBe('SYSTEM_NOTICE');
    expect(result.isSystemMessage).toBe(true);
  });

  it('classifies "End-to-end encrypted" as SYSTEM_NOTICE', () => {
    const result = classifyNotification(buildPayload('End-to-end encrypted'));
    expect(result.classification).toBe('SYSTEM_NOTICE');
    expect(result.isSystemMessage).toBe(true);
  });
});

/* =============================================================
   OTP Spam Detection
   ============================================================= */

describe('ClassificationEngine — OTP and Spam Detection', () => {
  it('classifies OTP code notification as OTP_SPAM', () => {
    const result = classifyNotification(buildPayload('Your verification code is 123456'));
    expect(result.classification).toBe('OTP_SPAM');
  });

  it('classifies OTP abbreviation as OTP_SPAM', () => {
    const result = classifyNotification(buildPayload('Your OTP is 8472'));
    expect(result.classification).toBe('OTP_SPAM');
  });

  it('classifies "one-time password" variants as OTP_SPAM', () => {
    const result = classifyNotification(buildPayload('Your one-time password: 391827'));
    expect(result.classification).toBe('OTP_SPAM');
  });
});

/* =============================================================
   User Message Classification
   ============================================================= */

describe('ClassificationEngine — User Message Classification', () => {
  it('classifies regular conversational text as USER_MESSAGE', () => {
    const result = classifyNotification(buildPayload('Hey! Are you free tomorrow?'));
    expect(result.classification).toBe('USER_MESSAGE');
    expect(result.isDeletion).toBe(false);
    expect(result.isEdit).toBe(false);
    expect(result.isSystemMessage).toBe(false);
  });

  it('preserves normalizedText for user messages', () => {
    const result = classifyNotification(buildPayload('Hello there'));
    expect(result.normalizedText).toBe('Hello there');
  });

  it('confidence for user messages is above 0.8', () => {
    const result = classifyNotification(buildPayload('Can we meet at 5?'));
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });
});

/* =============================================================
   Package Guard
   ============================================================= */

describe('ClassificationEngine — WhatsApp Package Guard', () => {
  it('accepts com.whatsapp package', () => {
    expect(isWhatsAppPackage('com.whatsapp')).toBe(true);
  });

  it('accepts com.whatsapp.w4b (WhatsApp Business) package', () => {
    expect(isWhatsAppPackage('com.whatsapp.w4b')).toBe(true);
  });

  it('rejects non-WhatsApp packages', () => {
    expect(isWhatsAppPackage('com.telegram.messenger')).toBe(false);
    expect(isWhatsAppPackage('com.facebook.katana')).toBe(false);
    expect(isWhatsAppPackage('')).toBe(false);
  });
});

/* =============================================================
   Jaccard Similarity Deduplication
   ============================================================= */

describe('ClassificationEngine — Jaccard Similarity Deduplication', () => {
  it('returns 1.0 for identical strings', () => {
    expect(computeJaccardSimilarity('hello world', 'hello world')).toBe(1.0);
  });

  it('returns 0.0 for completely disjoint strings', () => {
    expect(computeJaccardSimilarity('apple orange', 'banana grape')).toBe(0.0);
  });

  it('returns a value between 0 and 1 for partially matching strings', () => {
    const score = computeJaccardSimilarity('hello world test', 'hello earth test');
    expect(score).toBeGreaterThan(0.0);
    expect(score).toBeLessThan(1.0);
  });

  it('isDuplicate returns true for near-identical messages', () => {
    expect(isDuplicate('Good morning everyone', 'Good morning everyone')).toBe(true);
  });

  it('isDuplicate returns false for distinct messages', () => {
    expect(isDuplicate('I am going to the market', 'The weather is nice today')).toBe(false);
  });

  it('handles empty string inputs gracefully', () => {
    expect(computeJaccardSimilarity('', '')).toBe(1.0);
    expect(computeJaccardSimilarity('hello', '')).toBe(0.0);
  });
});
