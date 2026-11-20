/** @type {import('tailwindcss').Config} */
// Palette notes: `slate` and `white` are re-pointed to a warm paper/ink scale so
// every existing utility class (and dark mode) picks up the new look together.
// `indigo` is re-pointed to a near-black "ink" scale: the old brand colour is
// retired, and the single bright accent is `accent` (a highlighter lime).
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        white: '#FFFEFA',
        slate: {
          50: '#F8F6F0',
          100: '#F0EDE4',
          200: '#E4E0D3',
          300: '#CFCABA',
          400: '#A29D8D',
          500: '#78746A',
          600: '#5A574D',
          700: '#403E37',
          800: '#2A2823',
          900: '#1C1B18',
          950: '#131210',
        },
        indigo: {
          50: '#F5F4EF',
          100: '#E9E7DE',
          200: '#D2CFC2',
          300: '#B6B2A3',
          400: '#8D897B',
          500: '#5E5B50',
          600: '#2F2D28',
          700: '#22211D',
          800: '#171613',
          900: '#0F0E0C',
        },
        accent: {
          DEFAULT: '#C6F24E',
          hover: '#B5E53A',
          soft: '#EDF9C2',
          deep: '#6F8F0E',
        },
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Instrument Serif"', 'ui-serif', 'Georgia', 'serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'drawer-in': {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'drop-pulse': {
          '0%,100%': { opacity: '.55' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.18s ease-out',
        'slide-up': 'slide-up 0.22s ease-out',
        'drawer-in': 'drawer-in 0.22s cubic-bezier(.2,.8,.2,1)',
        'toast-in': 'toast-in 0.2s ease-out',
        'drop-pulse': 'drop-pulse 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
