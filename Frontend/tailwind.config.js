/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Los valores viven en variables CSS (src/assets/main.css) para que el
      // panel pueda cambiar a modo oscuro con la clase .theme-dark.
      colors: {
        brand: {
          bg: 'var(--brand-bg)',
          surface: 'var(--brand-surface)',
          sidebar: 'var(--brand-sidebar)',
          ink: 'var(--brand-ink)',
          inkSoft: 'var(--brand-ink-soft)',
          line: 'var(--brand-line)',
          muted: 'var(--brand-muted)',
          accent: 'var(--brand-accent)',
          accentHover: 'var(--brand-accent-hover)',
          accentSoft: 'var(--brand-accent-soft)',
          accentInk: 'var(--brand-accent-ink)',
          warnSoft: 'var(--brand-warn-soft)',
          warnInk: 'var(--brand-warn-ink)',
          warnLine: 'var(--brand-warn-line)',
          danger: 'var(--brand-danger)',
          dangerSoft: 'var(--brand-danger-soft)',
          dangerInk: 'var(--brand-danger-ink)',
          dangerLine: 'var(--brand-danger-line)',
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
