/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Refined editorial pairing: serif display + clean sans body
        // Loaded via @import in index.css from Google Fonts
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Inter Tight"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          50: '#f7f7f5',
          100: '#ebebe6',
          200: '#d6d6cc',
          300: '#b3b3a6',
          400: '#8c8c80',
          500: '#666660',
          600: '#494945',
          700: '#33332f',
          800: '#1f1f1d',
          900: '#0e0e0d',
        },
        accent: {
          50: '#f0f5fb',
          100: '#dbe7f3',
          500: '#1f3864',
          600: '#16294a',
          700: '#0f1c33',
        },
        sand: {
          50: '#faf8f3',
          100: '#f3eedf',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)',
        focus: '0 0 0 3px rgba(31, 56, 100, 0.15)',
      },
    },
  },
  plugins: [],
};
