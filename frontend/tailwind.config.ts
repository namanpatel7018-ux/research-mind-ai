import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        space: {
          950: '#030712',
          900: '#060B18',
          850: '#0A1024',
          800: '#0E172F',
        },
        surface: {
          DEFAULT: '#0B1120',
          soft: '#0F172A',
          muted: '#1E293B',
          card: 'rgba(11, 17, 32, 0.65)',
        },
        accent: {
          500: '#6366F1',
          600: '#4F46E5',
          400: '#818CF8',
          violet: '#8B5CF6',
          cyan: '#06B6D4',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(148, 163, 184, 0.08), 0 24px 80px rgba(15, 23, 42, 0.45)',
        'glass-sm': '0 4px 16px 0 rgba(0, 0, 0, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
        'glass-md': '0 8px 32px 0 rgba(0, 0, 0, 0.45), inset 0 1px 0 0 rgba(255, 255, 255, 0.12)',
        'glass-lg': '0 16px 48px 0 rgba(0, 0, 0, 0.55), inset 0 1px 0 0 rgba(255, 255, 255, 0.15)',
        'glow-indigo': '0 0 25px -4px rgba(99, 102, 241, 0.35)',
        'glow-violet': '0 0 25px -4px rgba(139, 92, 246, 0.35)',
        'glow-cyan': '0 0 25px -4px rgba(6, 182, 212, 0.3)',
      },
      spacing: {
        '4.5': '1.125rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2.5s infinite linear',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
