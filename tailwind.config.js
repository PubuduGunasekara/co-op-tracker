/** @type {import('tailwindcss').Config} */
// Cool neutrals (Tailwind's default slate) + one vivid brand blue. `indigo` and
// `accent` both point at the brand scale so every existing utility picks it up.
const brand = {
  50: '#EEF1FF',
  100: '#E0E5FF',
  200: '#C4CCFF',
  300: '#9EAAFF',
  400: '#7584FB',
  500: '#4A63F7',
  600: '#3A4FE6',
  700: '#2E3EC2',
  800: '#28359B',
  900: '#25317A',
}

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        indigo: brand,
        brand,
        accent: { DEFAULT: brand[500], hover: brand[600], soft: brand[50], deep: brand[700] },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.04)',
        lift: '0 10px 24px -10px rgba(15,23,42,0.22), 0 2px 6px rgba(15,23,42,0.06)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0', transform: 'translateY(4px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'slide-up': { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'drawer-in': { '0%': { opacity: '0', transform: 'translateX(24px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        'toast-in': { '0%': { opacity: '0', transform: 'translateY(8px) scale(.98)' }, '100%': { opacity: '1', transform: 'translateY(0) scale(1)' } },
        'drop-pulse': { '0%,100%': { opacity: '.55' }, '50%': { opacity: '1' } },
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
