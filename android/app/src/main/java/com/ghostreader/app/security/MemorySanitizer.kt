package com.ghostreader.app.security

/**
 * MemorySanitizer
 *
 * Provides explicit memory-clearing utilities for sensitive strings and
 * byte arrays. In the JVM, strings are immutable and interned, so true
 * in-memory zeroing is not fully achievable via String itself. However,
 * we use reflection as a best-effort approach for string clearing, and
 * provide direct byte array zeroing for cryptographic key buffers.
 *
 * Secure Coding Practices compliance:
 *   - Guideline 08: Data Protection — sensitive memory cleared after use
 *   - Guideline 13: Memory Management — explicit zeroing of key material
 *
 * Note: Android's garbage collector does not guarantee immediate collection.
 * The only fully reliable method for protecting key material is using
 * ByteArray and zeroing it explicitly after use. String clearance is
 * best-effort due to JVM string immutability.
 */
object MemorySanitizer {

    /**
     * clearString
     *
     * Attempts to overwrite the internal char array of a String using reflection.
     * This is a best-effort operation due to JVM String immutability and interning.
     * Fails silently if reflection access is denied (Android API 28+ restrictions).
     *
     * @param  sensitiveString  - String containing sensitive data to attempt clearing.
     * @edge-cases  - Interned String literals may not be clearable.
     *              - SecurityException from reflection access is caught and discarded.
     *              - This must never be called on null references.
     */
    fun clearString(sensitiveString: String) {
        try {
            val valueField = String::class.java.getDeclaredField("value")
            valueField.isAccessible = true
            val charArray = valueField.get(sensitiveString)
            when (charArray) {
                is CharArray  -> charArray.fill('\u0000')
                is ByteArray  -> charArray.fill(0)
                else          -> { /* No-op for unknown internal representation */ }
            }
        } catch (_: Exception) {
            /* Best-effort — failure is acceptable under strict reflection policies */
        }
    }

    /**
     * clearBytes
     *
     * Overwrites all bytes in a sensitive ByteArray with zero (0x00).
     * Used for cryptographic key material, hash outputs, and temporary
     * buffers holding plaintext credentials.
     *
     * This is the only fully reliable zeroing method on the JVM.
     * Always prefer ByteArray over String for sensitive cryptographic values.
     *
     * @param  sensitiveBytes  - ByteArray containing key material or sensitive data.
     *                           All bytes are overwritten with 0x00 in-place.
     * @edge-cases  - Empty array is accepted and results in a no-op.
     *              - Array is modified in-place; no new allocation occurs.
     */
    fun clearBytes(sensitiveBytes: ByteArray) {
        sensitiveBytes.fill(0)
    }

    /**
     * clearChars
     *
     * Overwrites all characters in a CharArray with null characters ('\u0000').
     * Used when building character-level PIN or password input before
     * converting to a hashed representation.
     *
     * @param  sensitiveChars  - CharArray containing sensitive character data.
     *                           All characters are overwritten with '\u0000' in-place.
     */
    fun clearChars(sensitiveChars: CharArray) {
        sensitiveChars.fill('\u0000')
    }
}
