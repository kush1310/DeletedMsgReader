/**
 * CryptoAuditService
 *
 * Implements on-device cryptographic verification routines:
 *   - SHA-256 message fingerprinting
 *   - Rolling Merkle hash chain computation for conversation histories
 *   - Tamper-detection audit verification
 *   - PBKDF2-HMAC-SHA256 key derivation for PIN validation
 *
 * Adheres strictly to OWASP Cryptographic Practices and Air-Gap integrity mandates.
 */

import type { Message, MerkleAuditResult } from '@/types';

/**
 * computeSha256
 *
 * Computes the hexadecimal SHA-256 digest of a string using Web Crypto API.
 *
 * @param  {string} message - Plaintext string.
 * @returns {Promise<string>} - Hex-encoded 64-character digest.
 */
export async function computeSha256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * verifyConversationIntegrity
 *
 * Computes a rolling Merkle hash chain across all messages in a conversation.
 * Verifies whether individual message hashSignatures match the computed SHA-256 digests.
 *
 * @param  {readonly Message[]} messages - Chronologically sorted messages in conversation.
 * @returns {Promise<MerkleAuditResult>}  - Complete audit report.
 */
export async function verifyConversationIntegrity(
  messages: readonly Message[]
): Promise<MerkleAuditResult> {
  if (messages.length === 0) {
    return {
      isValid:          true,
      totalMessages:    0,
      rootHash:         'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // SHA-256 of empty string
      verifiedAt:       Date.now(),
      compromisedCount: 0,
    };
  }

  let rollingHash = '0000000000000000000000000000000000000000000000000000000000000000';
  let compromised = 0;

  for (const msg of messages) {
    const rawExpectedSig = `${msg.conversationId}|${msg.senderName}|${msg.timestamp}|${msg.messageText ?? ''}`;
    const calculatedSig = await computeSha256(rawExpectedSig);

    /* Verify if stored signature matches recalculated digest */
    if (msg.hashSignature && msg.hashSignature.length === 64) {
      if (msg.hashSignature !== calculatedSig) {
        compromised++;
      }
    }

    /* Accumulate rolling Merkle tree leaf */
    rollingHash = await computeSha256(`${rollingHash}:${calculatedSig}`);
  }

  return {
    isValid:          compromised === 0,
    totalMessages:    messages.length,
    rootHash:         rollingHash,
    verifiedAt:       Date.now(),
    compromisedCount: compromised,
  };
}

/**
 * derivePinHash
 *
 * Derives a PBKDF2-HMAC-SHA256 hash from a 4-digit PIN with a fixed application salt.
 *
 * @param  {string} pin - 4-digit PIN string.
 * @returns {Promise<string>} - Hex-encoded derived key.
 */
export async function derivePinHash(pin: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const salt = enc.encode('NotiCatch-AirGap-Salt-2026');
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'HMAC', hash: 'SHA-256', length: 256 },
    true,
    ['sign', 'verify']
  );

  const rawKey = await crypto.subtle.exportKey('raw', derivedKey);
  const hashArray = Array.from(new Uint8Array(rawKey));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
