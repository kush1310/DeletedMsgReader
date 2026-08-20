/** @type {import('tailwindcss').Config} */

/**
 * Tailwind CSS configuration for NotiCatch.
 *
 * Configured strictly for Anthropic Claude Aesthetic:
 * - Fonts: Lora (Editorial Serif) + Plus Jakarta Sans (Clean Neo-grotesque UI Sans)
 * - Warm Parchment / Stone Cream canvas palette (#FAF9F5, #F4F3EE)
 * - Claude Terracotta Accent (#CC5A36, #B84D2B, #E06C48)
 * - Warm Honey-Amber for deleted messages (#FDF4E7, #9C5418)
 * - Soft warm elevations & pill radii
 */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        /* === Claude Warm Canvas & Surface Palette === */
        canvas: {
          DEFAULT: '#FAF9F5', // Claude Main Canvas (Warm Parchment)
          dark:    '#1C1C1A', // Dark Canvas
        },
        surface: {
          900: '#FFFFFF', // Crisp White Cards / Sheet Backdrops
          850: '#F4F3EE', // Light Bone / Container Backdrop
          800: '#FAF9F5', // Canvas Background (Warm Cream)
          750: '#EDE9DE', // Pill & Button Inset Surface
          700: '#E8E4D8', // Card Borders & Subtle Dividers
          600: '#D8D4C5', // Outline Borders & Separators
          500: '#A39F93', // Muted Icons & Secondary Borders
          400: '#7A766B', // Tertiary Text
        },
        /* === Claude Editorial High-Contrast Typography === */
        content: {
          primary:   '#1A1915', // Deep Charcoal Headings & Body Text
          secondary: '#4F4D46', // Warm Slate Subtitles & Secondary Text
          muted:     '#827F75', // Olive-Stone Timestamps & Muted Captions
          inverse:   '#FFFFFF', // White text on dark/colored buttons
        },
        /* === Claude Signature Terracotta Accent === */
        accent: {
          DEFAULT: '#CC5A36', // Anthropic Claude Terracotta Coral
          hover:   '#B84D2B', // Deep Terracotta on touch/hover
          muted:   '#F8ECE8', // Warm Terracotta Muted Pill Background
          light:   '#E06C48', // Lighter Terracotta Accent
        },
        /* === Recovered Deleted Message Honey-Amber Palette === */
        warning: {
          DEFAULT: '#CC5A36', // Terracotta Accent
          dark:    '#9C5418', // Dark Honey Amber Text
          muted:   '#FDF4E7', // Light Honey Amber Card Background
          light:   '#F3D3A6', // Soft Amber Border
        },
        amber: {
          50:  '#FDF8EE',
          100: '#FDF4E7',
          200: '#FBE8C8',
          300: '#F3D3A6',
          400: '#EBB46D',
          500: '#D9822B',
          600: '#C2691B',
          700: '#9C5418',
          800: '#7A4012',
          900: '#5C2F0C',
        },
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
      },
      fontFamily: {
        serif: ['Lora', 'Newsreader', 'Georgia', 'serif'],
        sans:  ['Plus Jakarta Sans', 'Inter', '-apple-system', 'sans-serif'],
        mono:  ['JetBrains Mono', 'Fira Code', 'monospace'],
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
        'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
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
        'xs':      '0 1px 2px rgba(26, 25, 21, 0.04)',
        'card':    '0 1px 3px rgba(26, 25, 21, 0.05), 0 1px 2px rgba(26, 25, 21, 0.03)',
        'card-lg': '0 8px 24px -4px rgba(26, 25, 21, 0.07), 0 4px 8px -2px rgba(26, 25, 21, 0.03)',
        'warm-sm': '0 2px 6px rgba(204, 90, 54, 0.08), 0 1px 2px rgba(26, 25, 21, 0.04)',
        'warm-md': '0 6px 16px rgba(204, 90, 54, 0.12), 0 2px 4px rgba(26, 25, 21, 0.04)',
        'skeuo-card': '0 2px 8px rgba(26, 25, 21, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
        'skeuo-chip': 'inset 0 1px 1px rgba(255, 255, 255, 0.9), 0 1px 2px rgba(26, 25, 21, 0.04)',
      },
    },
  },
  plugins: [],
}
