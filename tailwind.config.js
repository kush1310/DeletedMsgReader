/** @type {import('tailwindcss').Config} */

/**
 * Tailwind CSS configuration for NotiCatch (WhatsApp Notification Saver).
 *
 * Configured strictly for Material Design 3 Light Mode with:
 * - Outfit font family (AegisRx Design System)
 * - Neumorphic and Skeuomorphic tactile elevation tokens
 * - WhatsApp Signature Emerald Teal accent (#008069, #00A884)
 * - Smooth cubic-bezier spring physics
 */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        /* === Clean Material Light Surface Palette === */
        surface: {
          900: '#FFFFFF', // Crisp White Cards / Skeuomorphic Top Glass
          850: '#F8FAFC', // Subtle Off-White Inner Containers
          800: '#EEF2F6', // Neumorphic Canvas Background (Soft Cool Slate)
          700: '#E2E8F0', // Card Borders / Dividers / Neutral Hover
          600: '#CBD5E1', // Outline Borders / Inactive Dividers
          500: '#94A3B8', // Muted Icons / Secondary Borders
          400: '#64748B', // Tertiary Elements
        },
        /* === High Contrast Light Typography === */
        content: {
          primary:   '#0F172A', // Primary Text (Ultra-Crisp Deep Slate)
          secondary: '#334155', // Subtitles & Labels (Medium Slate)
          muted:     '#64748B', // Timestamps & Placeholders (Muted Slate Gray)
          inverse:   '#FFFFFF', // White text on dark/colored buttons
        },
        /* === WhatsApp Emerald Teal Accent === */
        accent: {
          DEFAULT: '#008069', // WhatsApp Signature Dark Teal
          hover:   '#006A57', // Hover State
          muted:   '#E8FAF6', // Soft Mint Background Pill
          light:   '#00A884', // Vibrant Green Accent
        },
        /* === Status & Online Indicators === */
        emerald: {
          DEFAULT: '#25D366', // WhatsApp Official Green
          dark:    '#128C7E', // Darker Teal
          muted:   '#DCF8C6', // WhatsApp Light Green Received Bubble
          light:   '#25D366', // Vibrant Green
        },
        /* === Deleted Message Alerts === */
        warning: {
          DEFAULT: '#D97706', // Amber Accent
          dark:    '#B45309', // Dark Amber Text
          muted:   '#FEF3C7', // Light Amber Warning Card
          light:   '#FDE68A', // Amber Border / Highlight
        },
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
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
        '250': '250ms',
        '350': '350ms',
        '450': '450ms',
      },
      keyframes: {
        'slide-up': {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%':   { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.65' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'slide-up':       'slide-up 300ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-in-right': 'slide-in-right 300ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in':        'fade-in 200ms ease-in-out both',
        'scale-in':       'scale-in 250ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'pulse-soft':     'pulse-soft 2s ease-in-out infinite',
        'shimmer':        'shimmer 1.6s linear infinite',
        'float':          'float 3s ease-in-out infinite',
      },
      boxShadow: {
        'xs':      '0 1px 2px rgba(15, 23, 42, 0.05)',
        /* Standard card elevations */
        'card':    '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
        'card-lg': '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
        /* Neumorphic Soft Light Shadows */
        'neu-flat':   '6px 6px 14px rgba(166, 175, 195, 0.35), -6px -6px 14px rgba(255, 255, 255, 0.9)',
        'neu-raised': '9px 9px 20px rgba(166, 175, 195, 0.45), -9px -9px 20px rgba(255, 255, 255, 0.95)',
        'neu-inset':  'inset 3px 3px 6px rgba(166, 175, 195, 0.35), inset -3px -3px 6px rgba(255, 255, 255, 0.9)',
        'neu-convex': 'inset 1px 1px 2px rgba(255, 255, 255, 0.8), 5px 5px 12px rgba(166, 175, 195, 0.3), -5px -5px 12px rgba(255, 255, 255, 0.85)',
        /* Skeuomorphic Tactile Bevels & Depth */
        'skeuo-btn':  '0 4px 6px -1px rgba(0, 128, 105, 0.25), 0 2px 4px -2px rgba(0, 128, 105, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 -2px 0 rgba(0, 0, 0, 0.18)',
        'skeuo-card': '0 4px 16px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.95), inset 0 -1px 0 rgba(15, 23, 42, 0.04)',
        'skeuo-chip': 'inset 0 1px 1px rgba(255, 255, 255, 0.9), 0 2px 4px rgba(15, 23, 42, 0.04)',
      },
    },
  },
  plugins: [],
}
