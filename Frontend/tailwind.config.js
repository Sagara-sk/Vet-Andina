/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#fafaf7',
          surface: '#ffffff',
          ink: '#1e211c',
          inkSoft: '#63665f',
          line: '#e1ded4',
          accent: '#34503a',
          accentSoft: '#e7eee3',
          accentInk: '#1f3323',
        }
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
        sans: ['Arial', '"Helvetica Neue"', 'Helvetica', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
