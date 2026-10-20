/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        forest: { 700: '#3E6B4B', 900: '#1F3A2A' },
        sage: { 300: '#A9C4AE', 500: '#6F9A78' },
        mist: { 100: '#EEF3F0', 200: '#DCE6E0', 400: '#B8C7BE' },
        ink: { 500: '#5E6661', 700: '#2B2F2D', 900: '#111312' },
        sand: { 300: '#C9A98A' },
        sunrise: { 400: '#E9B872' },
      },
      borderRadius: {
        xs: '8px',
        sm: '12px',
        md: '20px',
        lg: '28px',
        xl: '36px',
        pill: '9999px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 8px 24px rgba(31,58,42,0.12)',
        float: '0 16px 40px rgba(31,58,42,0.18)',
      },
    },
  },
  plugins: [],
};
