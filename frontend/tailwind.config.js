/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic tokens from Design.md
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb', // Primary action
          700: '#1d4ed8', // Hover
        },
        agent: {
          50: '#f5f3ff',  // Light AI tint
          100: '#ede9fe',
          600: '#7c3aed', // AI Agent accent
          700: '#6d28d9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '6px',
        md: '6px',
      },
    },
  },
  plugins: [],
};
