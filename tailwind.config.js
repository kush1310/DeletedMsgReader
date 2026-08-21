/** @type {import('tailwindcss').Config} */

/**
 * Tailwind CSS configuration for NotiCatch.
 *
 * Signal-inspired privacy communication design system:
 * - Fonts: Plus Jakarta Sans (clean system sans — no serif)
 * - Pure white canvas (#FFFFFF, #F8F9FA, #F2F2F7)
 * - Signal Blue accent (#2C6BED, #1B54D4)
 * - Deep charcoal typography (#111827, #4B5563, #9CA3AF)
 * - Amber deleted message palette (#FFF4E5, #92400E, #FED7AA)
 * - Hairline neutral borders (#E5E7EB, #D1D5DB)
 */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        /* === Signal-Inspired Clean Surfaces === */
        canvas: {
          DEFAULT: '#FFFFFF', // Pure White Main Canvas
          dark:    '#121212', // Signal Dark Chat Background
        },
        surface: {
          900: '#FFFFFF', // Crisp White Cards
          850: '#F8F9FA', // Off-White / Hovered Surface
          800: '#F2F2F7', // Section Divider Background (iOS/Signal style)
          750: '#E9ECEF', // Pressed / Active Surface
          700: '#E5E7EB', // Hairline Border — primary
          600: '#D1D5DB', // Heavier Separator
          500: '#9CA3AF', // Muted Icon / Placeholder
          400: '#6B7280', // Secondary Text / Icon
          dark: {
            900: '#1C1C1E', // Dark top bar / chat header
            850: '#1E2028', // Dark received bubble
            800: '#121212', // Chat timeline background
            700: '#2C2C2E', // Dark card border
          },
        },
        /* === High-Contrast Typography === */
        content: {
          primary:   '#111827', // Deep Charcoal — headings & body
          secondary: '#4B5563', // Medium Grey — subtitles & labels
          muted:     '#9CA3AF', // Muted — timestamps & captions
          inverse:   '#FFFFFF', // White text on colored/dark backgrounds
        },
        /* === Signal Blue — Sole Accent === */
        accent: {
          DEFAULT: '#2C6BED', // Signal Ultramarine Blue
          hover:   '#1B54D4', // Pressed state
          deep:    '#1447C0', // Active / focused state
          muted:   '#EEF2FF', // Soft blue tinted pill backgrounds
          light:   '#DBEAFE', // Lighter blue chip / badge backgrounds
        },
        /* === Amber — Deleted Message Palette === */
        deleted: {
          DEFAULT: '#FFF4E5', // Amber surface for deleted cards
          text:    '#92400E', // Dark amber readable text
          border:  '#FED7AA', // Soft amber border
          badge:   '#F59E0B', // Badge count indicator
          strong:  '#D97706', // Emphasis / icon color
        },
        /* === Status Colors === */
        emerald: {
          50:  '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
        },
        rose: {
          50:  '#FFF1F2',
          100: '#FFE4E6',
          200: '#FECDD3',
          300: '#FDA4AF',
          500: '#F43F5E',
          600: '#E11D48',
          700: '#BE123C',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      borderRadius: {
        'xl':  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.5rem',
      },
      transitionTimingFunction: {
        'spring':  'cubic-bezier(0.16, 1, 0.3, 1)',
        'ease-ios': 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      },
      transitionDuration: {
        '180': '180ms',
        '200': '200ms',
        '250': '250ms',
        '300': '300ms',
      },
      keyframes: {
        'slide-up': {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%':   { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'slide-up':   'slide-up 280ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-down': 'slide-down 240ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in':    'fade-in 200ms ease-in-out both',
        'scale-in':   'scale-in 240ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      boxShadow: {
        'xs':      '0 1px 2px rgba(17, 24, 39, 0.04)',
        'card':    '0 1px 3px rgba(17, 24, 39, 0.06), 0 1px 2px rgba(17, 24, 39, 0.04)',
        'card-lg': '0 8px 24px -4px rgba(17, 24, 39, 0.09), 0 4px 8px -2px rgba(17, 24, 39, 0.05)',
        'blue-sm': '0 2px 6px rgba(44, 107, 237, 0.18), 0 1px 2px rgba(17, 24, 39, 0.04)',
        'blue-md': '0 4px 14px rgba(44, 107, 237, 0.22), 0 2px 4px rgba(17, 24, 39, 0.04)',
      },
    },
  },
  plugins: [],
}
