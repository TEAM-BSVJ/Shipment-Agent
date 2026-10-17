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
        // Design.v2.md Futuristic Command Center Palette
        navy: {
          950: '#080D18', // Main app canvas backdrop
          900: '#101B2B', // Primary card/surface container
          850: '#142235', // Elevated surface (modals, drawers, active cards)
          800: '#18283A', // Secondary surface (inner panels, table headers)
          700: '#25364B', // Standard 1px dividing borders
          600: '#334A66', // Border glow / highlight on hover/focus
        },
        cyan: {
          300: '#67E3FF',
          400: '#38D9FF', // Primary navigation, active routes, focus rings, primary CTA
          500: '#20A6C7',
          600: '#168AA6',
        },
        mint: {
          300: '#5FF0C4',
          400: '#36E0B0', // Healthy milestones, resolved bottlenecks, success states
          500: '#28B68C',
          600: '#1D9470',
        },
        amber: {
          300: '#FFC875',
          400: '#FFB547', // Medium risk (31-60), caution thresholds, approaching cutoffs
          500: '#E59C35',
          600: '#BF7E22',
        },
        coral: {
          300: '#FF8596',
          400: '#FF5D73', // Critical/High risk (>60), overdue milestones, weight discrepancies
          500: '#E64C61',
          600: '#C7384B',
        },
        violet: {
          300: '#CFBCFF',
          400: '#B9A0FF', // Cognitive AI agent reasoning, Evolus AI indicators, LLM diagnostic output
          500: '#906EE8',
          600: '#7552CE',
        },
        slateText: {
          primary: '#E7EEF8',   // High-emphasis values, titles, headers
          secondary: '#9DAEC3', // Labels, body descriptions, table headers
          muted: '#73859C',     // Timestamps, helper hints, breadcrumbs
          disabled: '#4A5A6E',  // Inactive controls
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 14px rgba(56, 217, 255, 0.4)',
        'glow-coral': '0 0 14px rgba(255, 93, 115, 0.4)',
        'glow-violet': '0 0 16px rgba(185, 160, 255, 0.35)',
        'glow-mint': '0 0 14px rgba(54, 224, 176, 0.35)',
        'glow-amber': '0 0 14px rgba(255, 181, 71, 0.35)',
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '6px',
        lg: '10px',
        xl: '14px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'radar-sweep': 'radarSweep 4s linear infinite',
      },
      keyframes: {
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
};
