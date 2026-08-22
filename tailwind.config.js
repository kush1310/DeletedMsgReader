/** @type {import('tailwindcss').Config} */

/**
 * tailwind.config.js — NotiCatch Material You + Material 3 Expressive Design System
 *
 * Dark mode: class strategy — toggled via 'dark' class on <html> element.
 * All semantic tokens live in index.css as CSS custom properties.
 * Tailwind extends with animation keyframes, motion durations, and utilities.
 */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* Semantic aliases that map to CSS custom properties */
        primary:   'var(--md-sys-color-primary)',
        'on-primary': 'var(--md-sys-color-on-primary)',
        'primary-container': 'var(--md-sys-color-primary-container)',
        'on-primary-container': 'var(--md-sys-color-on-primary-container)',
        secondary: 'var(--md-sys-color-secondary)',
        surface:   'var(--md-sys-color-surface)',
        'on-surface': 'var(--md-sys-color-on-surface)',
        'surface-variant': 'var(--md-sys-color-surface-variant)',
        'on-surface-variant': 'var(--md-sys-color-on-surface-variant)',
        outline:   'var(--md-sys-color-outline)',
        'outline-variant': 'var(--md-sys-color-outline-variant)',
        tertiary:  'var(--md-sys-color-tertiary)',
        'tertiary-container': 'var(--md-sys-color-tertiary-container)',
        error:     'var(--md-sys-color-error)',
        'error-container': 'var(--md-sys-color-error-container)',
        /* Legacy aliases — retained for backward compat */
        canvas: {
          DEFAULT: 'var(--md-sys-color-background)',
          dark:    '#0F0F14',
        },
        surface: {
          900: 'var(--md-sys-color-surface-container-lowest)',
          850: 'var(--md-sys-color-surface-container-low)',
          800: 'var(--md-sys-color-surface-container)',
          750: 'var(--md-sys-color-surface-container-high)',
          700: 'var(--md-sys-color-outline-variant)',
          600: 'var(--md-sys-color-outline)',
        },
        content: {
          primary:   'var(--md-sys-color-on-surface)',
          secondary: 'var(--md-sys-color-on-surface-variant)',
          muted:     'var(--md-sys-color-on-surface-muted)',
          inverse:   'var(--md-sys-color-inverse-on-surface)',
        },
        accent: {
          DEFAULT: 'var(--md-sys-color-primary)',
          hover:   'var(--md-sys-color-primary-hover)',
          deep:    'var(--md-sys-color-primary-deep)',
          muted:   'var(--md-sys-color-primary-container)',
          light:   'var(--md-sys-color-primary-container)',
        },
        deleted: {
          DEFAULT: 'var(--md-sys-color-tertiary-container)',
          text:    'var(--md-sys-color-on-tertiary-container)',
          border:  'var(--md-sys-color-tertiary-border)',
          badge:   'var(--md-sys-color-tertiary)',
          strong:  'var(--md-sys-color-tertiary)',
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
          950: '#052E16',
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
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem', letterSpacing: '0.01em' }],
        'xs':  ['0.75rem',  { lineHeight: '1rem' }],
        'sm':  ['0.875rem', { lineHeight: '1.25rem' }],
        'md':  ['1rem',     { lineHeight: '1.5rem' }],
        'lg':  ['1.125rem', { lineHeight: '1.75rem' }],
        'xl':  ['1.25rem',  { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem',   { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      },
      borderRadius: {
        'none':  '0',
        'xs':    '4px',
        'sm':    '8px',
        'md':    '12px',
        'lg':    '16px',
        'xl':    '20px',
        '2xl':   '24px',
        '3xl':   '28px',
        'full':  '9999px',
      },
      spacing: {
        '4.5': '1.125rem',
        '13':  '3.25rem',
        '15':  '3.75rem',
        '17':  '4.25rem',
        '18':  '4.5rem',
        '22':  '5.5rem',
        '26':  '6.5rem',
        '30':  '7.5rem',
      },
      transitionTimingFunction: {
        'spring':      'cubic-bezier(0.16, 1, 0.3, 1)',
        'spring-soft': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'md-standard': 'cubic-bezier(0.2, 0, 0, 1)',
        'md-decel':    'cubic-bezier(0, 0, 0, 1)',
        'md-accel':    'cubic-bezier(0.3, 0, 1, 1)',
        'md-emphasized': 'cubic-bezier(0.2, 0, 0, 1)',
      },
      transitionDuration: {
        '80':  '80ms',
        '120': '120ms',
        '150': '150ms',
        '180': '180ms',
        '200': '200ms',
        '250': '250ms',
        '280': '280ms',
        '300': '300ms',
        '350': '350ms',
        '400': '400ms',
        '500': '500ms',
        '600': '600ms',
      },
      keyframes: {
        /* Entrance animations */
        'slide-up': {
          '0%':   { opacity: '0', transform: 'translateY(16px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'slide-down': {
          '0%':   { opacity: '0', transform: 'translateY(-12px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'slide-left': {
          '0%':   { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-right': {
          '0%':   { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%':   { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.88)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'scale-in-spring': {
          '0%':   { opacity: '0', transform: 'scale(0.82)' },
          '70%':  { opacity: '1', transform: 'scale(1.04)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        /* Sheet and modal entrance */
        'sheet-up': {
          '0%':   { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'sheet-down': {
          '0%':   { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(100%)' },
        },
        /* Micro-interactions */
        'press-down': {
          '0%':   { transform: 'scale(1)' },
          '50%':  { transform: 'scale(0.97)' },
          '100%': { transform: 'scale(1)' },
        },
        'bounce-in': {
          '0%':   { transform: 'scale(0)', opacity: '0' },
          '60%':  { transform: 'scale(1.12)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        /* Ripple */
        'ripple': {
          '0%':   { transform: 'scale(0)', opacity: '0.35' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
        /* Shimmer loading */
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        /* Pulse for live indicator */
        'pulse-ring': {
          '0%':   { transform: 'scale(1)',    opacity: '0.6' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        /* Tab indicator slide */
        'tab-select': {
          '0%':   { transform: 'scaleX(0.5)', opacity: '0.4' },
          '100%': { transform: 'scaleX(1)',   opacity: '1' },
        },
        /* Filter pill pop */
        'pill-pop': {
          '0%':   { transform: 'scale(0.92)', opacity: '0' },
          '60%':  { transform: 'scale(1.04)' },
          '100%': { transform: 'scale(1)',    opacity: '1' },
        },
        /* Spin for refresh */
        'spin': {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        /* Notification badge pop */
        'badge-pop': {
          '0%':   { transform: 'scale(0)', opacity: '0' },
          '60%':  { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)',  opacity: '1' },
        },
        /* Deleted amber glow */
        'amber-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(217, 119, 6, 0)' },
          '50%':       { boxShadow: '0 0 0 4px rgba(217, 119, 6, 0.12)' },
        },
        /* Haptic visual echo */
        'haptic-pulse': {
          '0%':   { transform: 'scale(1)' },
          '30%':  { transform: 'scale(0.97)' },
          '60%':  { transform: 'scale(1.01)' },
          '100%': { transform: 'scale(1)' },
        },
        /* Scroll reveal */
        'reveal-up': {
          '0%':   { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        /* Toggle thumb spring */
        'toggle-on': {
          '0%':   { transform: 'translateX(0)' },
          '60%':  { transform: 'translateX(22px) scale(0.9)' },
          '100%': { transform: 'translateX(20px) scale(1)' },
        },
        'toggle-off': {
          '0%':   { transform: 'translateX(20px)' },
          '60%':  { transform: 'translateX(-2px) scale(0.9)' },
          '100%': { transform: 'translateX(0) scale(1)' },
        },
      },
      animation: {
        'slide-up':       'slide-up 300ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-down':     'slide-down 260ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-left':     'slide-left 280ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-right':    'slide-right 280ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in':        'fade-in 220ms ease-in-out both',
        'fade-out':       'fade-out 180ms ease-in-out both',
        'scale-in':       'scale-in 260ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in-spring':'scale-in-spring 380ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'sheet-up':       'sheet-up 340ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'sheet-down':     'sheet-down 260ms cubic-bezier(0.4, 0, 1, 1) both',
        'press-down':     'press-down 160ms ease-in-out both',
        'bounce-in':      'bounce-in 400ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'ripple':         'ripple 600ms cubic-bezier(0.4, 0, 0.2, 1) both',
        'shimmer':        'shimmer 1.8s linear infinite',
        'pulse-ring':     'pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'tab-select':     'tab-select 220ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'pill-pop':       'pill-pop 260ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'spin':           'spin 0.7s linear infinite',
        'badge-pop':      'badge-pop 300ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'amber-glow':     'amber-glow 2.4s ease-in-out infinite',
        'haptic-pulse':   'haptic-pulse 180ms ease-in-out both',
        'reveal-up':      'reveal-up 360ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'toggle-on':      'toggle-on 220ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'toggle-off':     'toggle-off 220ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
      },
      boxShadow: {
        'xs':          '0 1px 2px rgba(0, 0, 0, 0.04)',
        'sm':          '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'md':          '0 4px 12px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.04)',
        'lg':          '0 8px 24px rgba(0, 0, 0, 0.09), 0 4px 8px rgba(0, 0, 0, 0.05)',
        'xl':          '0 16px 40px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.06)',
        'card':        '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'card-lg':     '0 8px 24px rgba(0, 0, 0, 0.09), 0 4px 8px rgba(0, 0, 0, 0.05)',
        'blue-sm':     '0 2px 8px rgba(44, 107, 237, 0.22), 0 1px 2px rgba(44, 107, 237, 0.1)',
        'blue-md':     '0 4px 16px rgba(44, 107, 237, 0.28), 0 2px 4px rgba(44, 107, 237, 0.12)',
        'blue-lg':     '0 8px 28px rgba(44, 107, 237, 0.32), 0 4px 8px rgba(44, 107, 237, 0.14)',
        'amber-sm':    '0 2px 8px rgba(217, 119, 6, 0.14), 0 1px 2px rgba(217, 119, 6, 0.08)',
        'inner-focus': 'inset 0 0 0 2px var(--md-sys-color-primary)',
        'tonal-1':     '0 1px 2px rgba(0, 0, 0, 0.03)',
        'tonal-2':     '0 1px 4px rgba(0, 0, 0, 0.06)',
        'tonal-3':     '0 2px 8px rgba(0, 0, 0, 0.08)',
        'tonal-4':     '0 4px 16px rgba(0, 0, 0, 0.10)',
        'tonal-5':     '0 8px 28px rgba(0, 0, 0, 0.12)',
        /* Dark mode shadows */
        'dark-tonal-1': '0 1px 2px rgba(0, 0, 0, 0.2)',
        'dark-tonal-2': '0 1px 4px rgba(0, 0, 0, 0.28)',
        'dark-tonal-3': '0 2px 8px rgba(0, 0, 0, 0.36)',
        'dark-tonal-4': '0 4px 16px rgba(0, 0, 0, 0.44)',
        'dark-tonal-5': '0 8px 28px rgba(0, 0, 0, 0.52)',
      },
      backdropBlur: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
      },
    },
  },
  plugins: [],
}
