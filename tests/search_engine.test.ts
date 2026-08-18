/**
 * search_engine.test.ts
 *
 * Automated verification suite for the Boyer-Moore-Horspool & Damerau-Levenshtein
 * string matching and ranking algorithms in SearchEngine.ts.
 */

import { describe, it, expect } from 'vitest';
import {
  buildHorspoolShiftTable,
  boyerMooreHorspoolSearch,
  computeDamerauLevenshteinDistance,
  searchAndRank,
} from '@/services/SearchEngine';

describe('SearchEngine — Boyer-Moore-Horspool Algorithm', () => {
  it('correctly constructs shift table δ₁ for pattern', () => {
    const table = buildHorspoolShiftTable('needle');
    // 'needle': length = 6. Loop runs i from 0 to 4 (i.e. length - 2):
    // i = 0 ('n'): 6 - 1 - 0 = 5
    // i = 1 ('e'): 6 - 1 - 1 = 4
    // i = 2 ('e'): 6 - 1 - 2 = 3 (overwrites 4)
    // i = 3 ('d'): 6 - 1 - 3 = 2
    // i = 4 ('l'): 6 - 1 - 4 = 1
    expect(table.get('n')).toBe(5);
    expect(table.get('e')).toBe(3);
    expect(table.get('d')).toBe(2);
    expect(table.get('l')).toBe(1);
  });

  it('finds exact match in middle of text in sublinear time', () => {
    const text = 'the quick brown fox jumps over the lazy dog';
    const matches = boyerMooreHorspoolSearch(text, 'brown');
    expect(matches).toEqual([10]);
  });

  it('finds match at index 0 (prefix)', () => {
    const text = 'important message from doctor';
    const matches = boyerMooreHorspoolSearch(text, 'important');
    expect(matches).toEqual([0]);
  });

  it('finds match at the end of text', () => {
    const text = 'meeting scheduled for tomorrow';
    const matches = boyerMooreHorspoolSearch(text, 'tomorrow');
    expect(matches).toEqual([22]);
  });

  it('finds multiple occurrences of a pattern', () => {
    const text = 'test one test two test three';
    const matches = boyerMooreHorspoolSearch(text, 'test');
    expect(matches).toEqual([0, 9, 18]);
  });

  it('returns empty array when pattern is not found', () => {
    const text = 'hello world';
    const matches = boyerMooreHorspoolSearch(text, 'goodbye');
    expect(matches).toEqual([]);
  });

  it('handles empty pattern or pattern longer than text', () => {
    expect(boyerMooreHorspoolSearch('hi', '')).toEqual([]);
    expect(boyerMooreHorspoolSearch('short', 'much longer pattern')).toEqual([]);
  });
});

describe('SearchEngine — Damerau-Levenshtein Distance', () => {
  it('returns 0 for identical strings', () => {
    expect(computeDamerauLevenshteinDistance('pharmacy', 'pharmacy')).toBe(0);
  });

  it('computes single substitution correctly', () => {
    expect(computeDamerauLevenshteinDistance('kitten', 'sitten')).toBe(1);
  });

  it('computes single deletion and insertion correctly', () => {
    expect(computeDamerauLevenshteinDistance('hello', 'helo')).toBe(1);
    expect(computeDamerauLevenshteinDistance('helo', 'hello')).toBe(1);
  });

  it('handles adjacent transposition (Damerau property)', () => {
    expect(computeDamerauLevenshteinDistance('alcie', 'alice')).toBe(1);
  });

  it('prunes early when edit distance exceeds maxLimit', () => {
    const dist = computeDamerauLevenshteinDistance('completely', 'different', 2);
    expect(dist).toBeGreaterThan(2);
  });
});

describe('SearchEngine — Unified searchAndRank Pipeline', () => {
  const sampleMessages = [
    { id: '1', text: 'Alice Sharma: Doctor prescription ready' },
    { id: '2', text: 'Bob Mehta: Are we meeting tomorrow at 6 PM?' },
    { id: '3', text: 'Family Group: Happy Birthday to our dear sister' },
    { id: '4', text: 'Courier: Your package will be delivered today' },
  ];

  it('ranks exact BMH matches higher than partial matches', () => {
    const results = searchAndRank(sampleMessages, m => m.text, 'doctor');
    expect(results.length).toBe(1);
    expect(results[0].item.id).toBe('1');
    expect(results[0].matchType).toBe('EXACT_BMH');
    expect(results[0].score).toBeGreaterThanOrEqual(80);
    expect(results[0].highlights[0]).toBeDefined();
  });

  it('matches prefix substrings via BMH correctly', () => {
    const results = searchAndRank(sampleMessages, m => m.text, 'prescrip');
    expect(results.length).toBe(1);
    expect(results[0].item.id).toBe('1');
    expect(results[0].matchType).toBe('EXACT_BMH');
  });

  it('finds fuzzy typo matches like "tomorow" for "tomorrow"', () => {
    const results = searchAndRank(sampleMessages, m => m.text, 'tomorow');
    expect(results.length).toBe(1);
    expect(results[0].item.id).toBe('2');
    expect(results[0].matchType).toBe('FUZZY_LEVENSHTEIN');
  });

  it('returns all items when query is empty string', () => {
    const results = searchAndRank(sampleMessages, m => m.text, '');
    expect(results.length).toBe(sampleMessages.length);
  });
});
