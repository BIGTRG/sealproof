import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  'var(--brand-50,  #F7F5F0)',
          100: 'var(--brand-100, #EDE9DF)',
          200: 'var(--brand-200, #DDD6C5)',
          300: 'var(--brand-300, #C5A05E)',
          400: 'var(--brand-400, #B8913F)',
          500: 'var(--brand-500, #A07D35)',
          600: 'var(--brand-600, #8B6B2A)',
          700: 'var(--brand-700, #6E5522)',
          800: 'var(--brand-800, #1A2332)',
          900: 'var(--brand-900, #0F1B2D)',
          950: 'var(--brand-950, #0A1220)',
        },
        gold: {
          50:  '#FBF8F0',
          100: '#F5EEDB',
          200: '#ECDCB5',
          300: '#C5A05E',
          400: '#B8913F',
          500: '#A07D35',
          600: '#8B6B2A',
        },
        navy: {
          50:  '#E8ECF0',
          100: '#C5CEDA',
          200: '#8A9BB5',
          300: '#4E6890',
          400: '#2C4A73',
          500: '#1A2332',
          600: '#151E2B',
          700: '#0F1B2D',
          800: '#0A1220',
          900: '#060D17',
        },
        surface: {
          DEFAULT: 'var(--surface, #FFFFFF)',
          alt:    'var(--surface-alt, #FAFAF7)',
          warm:   'var(--surface-warm, #F7F5F0)',
          dark:   'var(--surface-dark, #0F1B2D)',
        },
      },
      fontFamily: {
        script:  ['var(--font-script)', '\"Great Vibes\"', 'cursive'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        serif:   ['"Cormorant Garamond"', 'Georgia', 'serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '600' }],
        'display-md': ['2.5rem', { lineHeight: '1.15', letterSpacing: '-0.01em', fontWeight: '600' }],
        'display-sm': ['2rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
      },
      borderRadius: {
        'legal': '0.25rem',
      },
      boxShadow: {
        'legal-sm': '0 1px 3px 0 rgba(15, 27, 45, 0.06), 0 1px 2px -1px rgba(15, 27, 45, 0.06)',
        'legal-md': '0 4px 12px -2px rgba(15, 27, 45, 0.08), 0 2px 6px -2px rgba(15, 27, 45, 0.04)',
        'legal-lg': '0 8px 24px -4px rgba(15, 27, 45, 0.10), 0 4px 12px -4px rgba(15, 27, 45, 0.06)',
        'gold-glow': '0 0 20px rgba(197, 160, 94, 0.15)',
      },
    },
  },
  plugins: [],
};

export default config;
