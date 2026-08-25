/**
 * EntityExtractor
 *
 * Rule-based heuristic entity extractor for recovered deleted messages.
 * Detects high-priority data points:
 *   - Phone numbers (national and international format)
 *   - URLs & web links
 *   - Email addresses
 *   - OTP / Verification codes
 *   - Meeting times & timestamps
 */

import type { ExtractedEntity } from '@/types';

const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const URL_REGEX   = /https?:\/\/[^\s/$.?#].[^\s]*/gi;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const OTP_REGEX   = /\b\d{4,8}\b/g;
const TIME_REGEX  = /\b(?:1[0-2]|0?[1-9])(?::[0-5][0-9])?\s*(?:am|pm|AM|PM)\b|\b(?:[01]?[0-9]|2[0-3]):[0-5][0-9]\b/g;

/**
 * extractEntities
 *
 * Scans a message text string and extracts structured entities for UI highlight chips.
 *
 * @param  {string | null} text - Message text to inspect.
 * @returns {ExtractedEntity[]} - Array of extracted entity objects.
 */
export function extractEntities(text: string | null | undefined): ExtractedEntity[] {
  if (!text || text.length < 3) return [];

  const entities: ExtractedEntity[] = [];

  /* 1. URLs (only if "http" or "www" present) */
  if (text.includes('http') || text.includes('www.')) {
    const urlMatches = text.match(URL_REGEX);
    if (urlMatches) {
      for (const match of urlMatches) {
        entities.push({
          type:  'URL',
          value: match,
          label: 'Link',
        });
      }
    }
  }

  /* 2. Phone Numbers (only if digits present) */
  if (/\d{3}/.test(text)) {
    const phoneMatches = text.match(PHONE_REGEX);
    if (phoneMatches) {
      for (const match of phoneMatches) {
        if (match.length >= 10) {
          entities.push({
            type:  'PHONE_NUMBER',
            value: match,
            label: 'Phone',
          });
        }
      }
    }
  }

  /* 3. Email Addresses (only if "@" present) */
  if (text.includes('@')) {
    const emailMatches = text.match(EMAIL_REGEX);
    if (emailMatches) {
      for (const match of emailMatches) {
        entities.push({
          type:  'EMAIL',
          value: match,
          label: 'Email',
        });
      }
    }
  }

  /* 4. Meeting Times (only if ":" or am/pm present) */
  if (text.includes(':') || /am|pm/i.test(text)) {
    const timeMatches = text.match(TIME_REGEX);
    if (timeMatches) {
      for (const match of timeMatches) {
        entities.push({
          type:  'MEETING_TIME',
          value: match,
          label: 'Time',
        });
      }
    }
  }

  /* 5. OTP Codes (only if accompanied by OTP / code keywords) */
  if (/\b(otp|code|pin|password|verification)\b/i.test(text)) {
    const otpMatches = text.match(OTP_REGEX);
    if (otpMatches) {
      for (const match of otpMatches) {
        if (!entities.some(e => e.value === match)) {
          entities.push({
            type:  'OTP_CODE',
            value: match,
            label: 'OTP Code',
          });
        }
      }
    }
  }

  return entities;
}
