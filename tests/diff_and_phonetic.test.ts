/**
 * diff_and_phonetic.test.ts
 *
 * Unit tests verifying:
 * 1. LCS word-level diff calculation in DiffEngine.ts
 * 2. Double-Metaphone phonetic indexing in SearchEngine.ts
 * 3. Search matching against pre-edited originalText
 */

import { describe, it, expect } from 'vitest';
import { computeWordDiff } from '@/services/DiffEngine';
import { doubleMetaphoneKey, searchSingleItem } from '@/services/SearchEngine';

describe('DiffEngine — Word-Level LCS Diffing', () => {
  it('returns empty array when both inputs are empty or null', () => {
    expect(computeWordDiff(null, null)).toEqual([]);
    expect(computeWordDiff('', '')).toEqual([]);
  });

  it('returns ADDED chunk when originalText is null or empty', () => {
    const diff = computeWordDiff('', 'Hello world');
    expect(diff).toEqual([{ type: 'ADDED', text: 'Hello world' }]);
  });

  it('returns REMOVED chunk when newText is null or empty', () => {
    const diff = computeWordDiff('Hello world', '');
    expect(diff).toEqual([{ type: 'REMOVED', text: 'Hello world' }]);
  });

  it('returns UNCHANGED when texts are identical', () => {
    const diff = computeWordDiff('Meeting at 5 PM', 'Meeting at 5 PM');
    expect(diff).toEqual([{ type: 'UNCHANGED', text: 'Meeting at 5 PM' }]);
  });

  it('accurately identifies word substitution diff', () => {
    const diff = computeWordDiff('Meeting at 4 PM', 'Meeting at 5 PM');
    expect(diff.some(c => c.type === 'REMOVED' && c.text.includes('4'))).toBe(true);
    expect(diff.some(c => c.type === 'ADDED' && c.text.includes('5'))).toBe(true);
    expect(diff.some(c => c.type === 'UNCHANGED' && c.text.includes('Meeting'))).toBe(true);
  });
});

describe('SearchEngine — Double-Metaphone Phonetic Key', () => {
  it('generates consistent 4-character phonetic sound keys', () => {
    const key1 = doubleMetaphoneKey('Robert');
    const key2 = doubleMetaphoneKey('Rupert');
    expect(key1).toBe('RPRT');
    expect(key2).toBe('RPRT');
  });

  it('handles empty or non-alphabetic inputs gracefully', () => {
    expect(doubleMetaphoneKey('')).toBe('');
    expect(doubleMetaphoneKey('12345')).toBe('');
  });

  it('matches edited message by pre-edited originalText', () => {
    const item = {
      messageText:  'Meeting at 5 PM',
      originalText: 'Meeting at 4 PM',
      senderName:   'Alice',
    };

    const match = searchSingleItem(item, '4 PM', (m) => ({
      primary:  m.messageText,
      original: m.originalText,
      secondary: m.senderName,
    }));

    expect(match.matchType).toBe('EXACT_BMH');
    expect(match.score).toBeGreaterThan(50);
  });
});
