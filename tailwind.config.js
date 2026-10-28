/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        msblue: {
          50: '#eff6fc',
          100: '#deecf9',
          200: '#c7e0f4',
          500: '#0078d4',
          600: '#106ebe',
          700: '#005a9e',
          800: '#004578',
        },
        powerbi: {
          yellow: '#f2c811',
          sidebar: '#252423',
          sidebarHover: '#323130',
          canvas: '#f3f2f1',
        },
        excel: {
          header: '#f2f2f2',
          border: '#d4d4d4',
          selected: '#e7f1ec',
          green: '#107c41'
        }
      },
      fontFamily: {
        sans: ['Segoe UI', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'Courier New', 'monospace']
      }
    },
  },
  plugins: [],
}
