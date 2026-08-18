/**
 * Vitest global test setup
 * Configures jsdom environment and any required global polyfills.
 */

/* Polyfill Web Crypto API for jsdom environment */
Object.defineProperty(globalThis, 'crypto', {
  value: {
    subtle: {
      digest: async (_algorithm: string, _data: BufferSource): Promise<ArrayBuffer> => {
        /* Deterministic mock SHA-256 returning 32 zero bytes for testing */
        return new ArrayBuffer(32);
      },
    },
    getRandomValues: (array: Uint8Array): Uint8Array => {
      for (let index = 0; index < array.length; index++) {
        array[index] = Math.floor(Math.random() * 256);
      }
      return array;
    },
    randomUUID: (): string => {
      return '00000000-0000-4000-8000-000000000000';
    },
  },
  writable: true,
});
