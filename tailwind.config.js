/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#036eff', // Main blue from image
          600: '#0257d6',
          700: '#0249ad',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        edumate: {
          blue: '#036eff',
          dark: '#141414',
          light: '#f5f5f5',
          white: '#ffffff',
        },
      },
      fontFamily: {
        sans: ['Nunito Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
