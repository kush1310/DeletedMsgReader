/**
 * DiffEngine.ts
 *
 * High-performance Myers Longest Common Subsequence (LCS) diff calculation engine.
 * Computes word-level and character-level differences between original and edited WhatsApp messages.
 *
 * Produces structured DiffChunk[] with ADDED, REMOVED, and UNCHANGED spans
 * for color-coded visual rendering in the message bubble.
 */

import type { DiffChunk, DiffType } from '@/types';

/**
 * computeWordDiff
 *
 * Computes structured word-level differences between originalText and newText.
 *
 * @param   {string} originalText - The pre-edited message text.
 * @param   {string} newText      - The current edited message text.
 * @returns {DiffChunk[]}         - Ordered array of ADDED, REMOVED, and UNCHANGED chunks.
 */
export function computeWordDiff(originalText: string | null | undefined, newText: string | null | undefined): DiffChunk[] {
  const orig = (originalText ?? '').trim();
  const next = (newText ?? '').trim();

  if (!orig && !next) return [];
  if (!orig) return [{ type: 'ADDED', text: next }];
  if (!next) return [{ type: 'REMOVED', text: orig }];
  if (orig === next) return [{ type: 'UNCHANGED', text: orig }];

  const origTokens = orig.split(/(\s+)/);
  const nextTokens = next.split(/(\s+)/);

  const matrix: number[][] = Array.from({ length: origTokens.length + 1 }, () =>
    new Array(nextTokens.length + 1).fill(0)
  );

  /* Build LCS dynamic programming matrix */
  for (let i = 1; i <= origTokens.length; i++) {
    for (let j = 1; j <= nextTokens.length; j++) {
      if (origTokens[i - 1] === nextTokens[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1] + 1;
      } else {
        matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
      }
    }
  }

  /* Backtrack to construct diff chunks */
  const chunks: DiffChunk[] = [];
  let i = origTokens.length;
  let j = nextTokens.length;

  const rawChunks: { type: DiffType; text: string }[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origTokens[i - 1] === nextTokens[j - 1]) {
      rawChunks.unshift({ type: 'UNCHANGED', text: origTokens[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
      rawChunks.unshift({ type: 'ADDED', text: nextTokens[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || matrix[i][j - 1] < matrix[i - 1][j])) {
      rawChunks.unshift({ type: 'REMOVED', text: origTokens[i - 1] });
      i--;
    }
  }

  /* Consolidate contiguous chunks of same type */
  for (const chunk of rawChunks) {
    if (chunks.length > 0 && chunks[chunks.length - 1].type === chunk.type) {
      chunks[chunks.length - 1] = {
        type: chunk.type,
        text: chunks[chunks.length - 1].text + chunk.text,
      };
    } else {
      chunks.push(chunk);
    }
  }

  return chunks;
}
