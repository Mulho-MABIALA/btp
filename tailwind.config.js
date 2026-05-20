/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* Cobalt Blue — primary accent */
        blue: {
          400: '#4a7df8',
          500: '#1652f0',
          600: '#1040cc',
          700: '#0d31a3',
        },
        /* Navy — dark backgrounds */
        navy: {
          600:  '#1e3a5f',
          700:  '#162c5f',
          800:  '#112240',
          900:  '#0b1628',
          950:  '#060e1c',
        },
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },

      boxShadow: {
        'blue':    '0 4px 20px -4px rgba(22,82,240,0.40)',
        'blue-lg': '0 8px 32px -6px rgba(22,82,240,0.50)',
        'glow':    '0 0 40px rgba(22,82,240,0.25)',
      },

      animation: {
        'fade-up':   'fadeUp 0.6s ease-out forwards',
        'fade-in':   'fadeIn 0.5s ease-out forwards',
        'spin-slow': 'spin 12s linear infinite',
        'pulse-slow':'pulse 4s ease-in-out infinite',
      },

      keyframes: {
        fadeUp:  { '0%': { opacity: '0', transform: 'translateY(24px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
      },

      backgroundImage: {
        'gradient-navy':      'linear-gradient(135deg, #060e1c 0%, #0b1628 60%, #162c5f 100%)',
        'gradient-blue-dark': 'linear-gradient(135deg, #0b1628 0%, #0d31a3 100%)',
      },
    },
  },

  /* Safelist: navy + blue classes used in JSX dynamic strings */
  safelist: [
    { pattern: /^(bg|text|border|ring)-(navy|blue)-(400|500|600|700|800|900|950)$/ },
  ],

  plugins: [],
}
