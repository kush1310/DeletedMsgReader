/**
 * SearchEngine.ts — High-Performance String Matching & Fuzzy Search Engine
 *
 * Implements industry-grade algorithms for searching WhatsApp notifications:
 *
 * 1. Boyer-Moore-Horspool (BMH) Exact Substring Matching
 *    - Average Time Complexity:  O(n / m) sub-linear
 *    - Worst-case Time:         O(n × m)
 *    - Best-case Time:          Ω(n / m)
 *    - Space Complexity:        O(σ) where σ is the alphabet / character map size
 *    - Precomputes the Bad Character Shift Table δ₁(c) in O(m + σ) time.
 *
 * 2. Damerau-Levenshtein Edit Distance (Fuzzy Matcher)
 *    - Time Complexity:         O(m × n) with early-exit distance threshold pruning
 *    - Space Complexity:        O(min(m, n)) optimized two-row sliding window
 *    - Supports single-character insertions, deletions, substitutions, and transpositions.
 *
 * 3. Multi-Attribute Relevance Scoring & Highlight Extractor
 *    - Scores results by exact BMH occurrences, prefix matches, and fuzzy edit proximity.
 *    - Returns exact character intervals [startOffset, endOffset] for highlighted rendering.
 */

import { sanitizeTextInput } from './SecurityService';

/* =============================================================
   Data Structures & Types
   ============================================================= */

export interface HighlightSpan {
  readonly start: number;
  readonly end:   number;
}

export interface SearchMatchResult<T> {
  readonly item:        T;
  readonly score:       number; // Higher is better (0.0 to 100.0)
  readonly highlights:  HighlightSpan[];
  readonly matchType:   'EXACT_BMH' | 'PREFIX' | 'FUZZY_LEVENSHTEIN' | 'NONE';
}

/* =============================================================
   1. Boyer-Moore-Horspool Algorithm
   ============================================================= */

/**
 * buildHorspoolShiftTable
 *
 * Precomputes the bad character shift table δ₁ for pattern P of length m.
 * For each character c in the alphabet, δ₁(c) determines the distance
 * the search window slides when a mismatch occurs at the last character.
 *
 * Formula:
 *   δ₁(c) = m                    if c ∉ P[0 .. m-2]
 *   δ₁(c) = m - 1 - max{i : P[i] = c, 0 ≤ i < m-1}
 *
 * @param   pattern - Search pattern string.
 * @returns Map of character code to shift distance.
 * @complexity Time: O(m), Space: O(σ) where m = pattern.length.
 */
export function buildHorspoolShiftTable(pattern: string): Map<string, number> {
  const m = pattern.length;
  const shiftTable = new Map<string, number>();

  for (let i = 0; i < m - 1; i++) {
    shiftTable.set(pattern[i], m - 1 - i);
  }

  return shiftTable;
}

/**
 * boyerMooreHorspoolSearch
 *
 * Executes the Boyer-Moore-Horspool exact substring search on text T for pattern P.
 * Compares characters from right to left starting at the end of the pattern window.
 * Upon mismatch, shifts the window forward by δ₁(T[windowEnd]).
 *
 * @param  text     - Target text corpus to search within.
 * @param  pattern  - Search pattern string.
 * @returns Array of starting indices where pattern occurs in text.
 * @complexity Average Time: O(n / m), Worst-case: O(n × m), Space: O(1) auxiliary.
 */
export function boyerMooreHorspoolSearch(text: string, pattern: string): number[] {
  const n = text.length;
  const m = pattern.length;

  if (m === 0 || n < m) return [];

  const shiftTable = buildHorspoolShiftTable(pattern);
  const matchIndices: number[] = [];
  let windowStart = 0;

  while (windowStart <= n - m) {
    let patternIndex = m - 1;

    while (patternIndex >= 0 && pattern[patternIndex] === text[windowStart + patternIndex]) {
      patternIndex--;
    }

    if (patternIndex < 0) {
      /* Full exact match identified */
      matchIndices.push(windowStart);
      /* Advance window by 1 or shift table value to find subsequent matches */
      const lastChar = text[windowStart + m - 1];
      windowStart += shiftTable.get(lastChar) ?? m;
    } else {
      /* Mismatch occurred: query shift table using the last character of the current window */
      const mismatchChar = text[windowStart + m - 1];
      const shift = shiftTable.get(mismatchChar) ?? m;
      windowStart += Math.max(1, shift);
    }
  }

  return matchIndices;
}

/* =============================================================
   2. Damerau-Levenshtein Distance (Fuzzy Matcher)
   ============================================================= */

/**
 * computeDamerauLevenshteinDistance
 *
 * Calculates the minimum number of single-character edits (insertions, deletions,
 * substitutions, and adjacent transpositions) needed to transform string `source`
 * into string `target`. Employs a space-optimized O(min(m, n)) matrix representation.
 *
 * @param  source    - First string.
 * @param  target    - Second string.
 * @param  maxLimit  - Maximum allowed edit distance for early exit pruning.
 * @returns Edit distance integer.
 * @complexity Time: O(m × n), Space: O(min(m, n)).
 */
export function computeDamerauLevenshteinDistance(
  source: string,
  target: string,
  maxLimit: number = 4,
): number {
  const m = source.length;
  const n = target.length;

  if (Math.abs(m - n) > maxLimit) return maxLimit + 1;
  if (m === 0) return n;
  if (n === 0) return m;

  /* Initialize previous two rows for transposition tracking */
  let prevPrevRow: number[] = new Array(n + 1).fill(0);
  let prevRow:     number[] = Array.from({ length: n + 1 }, (_, i) => i);
  let currentRow:  number[] = new Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    currentRow[0] = i;
    let minRowVal = currentRow[0];

    for (let j = 1; j <= n; j++) {
      const cost = source[i - 1] === target[j - 1] ? 0 : 1;

      /* Standard Levenshtein: deletion, insertion, substitution */
      let distance = Math.min(
        currentRow[j - 1] + 1,       // Insertion
        prevRow[j] + 1,               // Deletion
        prevRow[j - 1] + cost,        // Substitution
      );

      /* Damerau transposition check */
      if (
        i > 1 &&
        j > 1 &&
        source[i - 1] === target[j - 2] &&
        source[i - 2] === target[j - 1]
      ) {
        distance = Math.min(distance, prevPrevRow[j - 2] + 1);
      }

      currentRow[j] = distance;
      if (distance < minRowVal) minRowVal = distance;
    }

    /* Early termination if minimum cost in row exceeds maxLimit */
    if (minRowVal > maxLimit) return maxLimit + 1;

    /* Slide rows */
    prevPrevRow = [...prevRow];
    prevRow     = [...currentRow];
  }

  return prevRow[n];
}

/* =============================================================
   3. Unified Search & Ranking Engine
   ============================================================= */

/**
 * searchAndRank
 *
 * Generic search pipeline that matches query against text extracted from items.
 * Ranks candidates through a tiered hybrid approach:
 *   1. Exact Boyer-Moore-Horspool match (Highest Score: 80 - 100)
 *   2. Word Prefix Match (Score: 60 - 79)
 *   3. Token-level Fuzzy Match via Damerau-Levenshtein (Score: 30 - 59)
 *
 * @param  items         - Array of items to search.
 * @param  getText       - Field extractor function returning searchable string.
 * @param  query         - User search query.
 * @returns Filtered, scored, and sorted match results.
 * @complexity Time: O(K × (N/M + L)) where K = items.length, N = avg text len, M = query len.
 */
export function searchAndRank<T>(
  items:   T[],
  getText: (item: T) => string,
  query:   string,
): SearchMatchResult<T>[] {
  const sanitizedQuery = sanitizeTextInput(query.trim()).toLowerCase();
  if (!sanitizedQuery) {
    return items.map(item => ({
      item,
      score: 1.0,
      highlights: [],
      matchType: 'NONE',
    }));
  }

  const queryLen = sanitizedQuery.length;
  const results: SearchMatchResult<T>[] = [];

  for (const item of items) {
    const rawText = getText(item);
    const normalizedText = rawText.toLowerCase();

    /* Phase 1: Boyer-Moore-Horspool Exact Substring Match */
    const exactMatches = boyerMooreHorspoolSearch(normalizedText, sanitizedQuery);

    if (exactMatches.length > 0) {
      const highlights: HighlightSpan[] = exactMatches.map(start => ({
        start,
        end: start + queryLen,
      }));

      /* Score calculation: Base 80 + bonus for start-of-string + density */
      const isStartOfString = exactMatches[0] === 0 ? 15 : 0;
      const occurrenceBonus = Math.min(exactMatches.length * 2, 5);
      const score = 80 + isStartOfString + occurrenceBonus;

      results.push({
        item,
        score,
        highlights,
        matchType: 'EXACT_BMH',
      });
      continue;
    }

    /* Phase 2: Token-Level Prefix Matching */
    const words = normalizedText.split(/\s+/);
    let prefixFound = false;
    let prefixOffset = 0;
    const prefixHighlights: HighlightSpan[] = [];

    for (const word of words) {
      const wordStart = normalizedText.indexOf(word, prefixOffset);
      if (word.startsWith(sanitizedQuery)) {
        prefixFound = true;
        prefixHighlights.push({
          start: wordStart,
          end:   wordStart + queryLen,
        });
      }
      prefixOffset = wordStart + word.length;
    }

    if (prefixFound) {
      results.push({
        item,
        score: 65,
        highlights: prefixHighlights,
        matchType: 'PREFIX',
      });
      continue;
    }

    /* Phase 3: Fuzzy Matching with Damerau-Levenshtein */
    if (queryLen >= 3) {
      const maxAllowedDistance = Math.min(2, Math.floor(queryLen * 0.35));
      let bestFuzzyDistance = maxAllowedDistance + 1;
      let bestFuzzySpan: HighlightSpan | null = null;

      prefixOffset = 0;
      for (const word of words) {
        const wordStart = normalizedText.indexOf(word, prefixOffset);
        const dist = computeDamerauLevenshteinDistance(sanitizedQuery, word, maxAllowedDistance);

        if (dist <= maxAllowedDistance && dist < bestFuzzyDistance) {
          bestFuzzyDistance = dist;
          bestFuzzySpan = {
            start: wordStart,
            end:   wordStart + word.length,
          };
        }
        prefixOffset = wordStart + word.length;
      }

      if (bestFuzzyDistance <= maxAllowedDistance && bestFuzzySpan) {
        /* Proximity score normalized by query length */
        const proximityRatio = 1.0 - (bestFuzzyDistance / queryLen);
        const score = 40 + Math.round(proximityRatio * 19);

        results.push({
          item,
          score,
          highlights: [bestFuzzySpan],
          matchType: 'FUZZY_LEVENSHTEIN',
        });
      }
    }
  }

  /* Sort descending by match score */
  return results.sort((a, b) => b.score - a.score);
}
