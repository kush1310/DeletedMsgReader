import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * Vite configuration for NotiCatch.
 *
 * Performance & Security:
 * - Drops console and debugger statements in production
 * - Disables source maps in production
 * - Manual chunk splitting for vendor libraries
 * - CSS code-splitting and asset inlining optimizations
 */
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
    legalComments: 'none',
  },
  build: {
    target: 'es2020',
    sourcemap: mode !== 'production',
    minify: 'esbuild',
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          lucide: ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
  },
}))
