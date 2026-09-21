/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pixel: {
          black: "#060608",
          dark: "#0b0c10",
          navy: "#0d1322",
          purple: "#1b0d2b",
          brown: "#24130b",
          orange: {
            burnt: "#d94e16",
            fiery: "#ff5500",
            bright: "#ff7700",
            glow: "#ff9900",
          },
          amber: "#f5a623",
          yellow: "#ffe600",
          cream: "#f5e6ca",
          cyan: "#00f0ff",
          green: "#00ff66",
          red: "#ff2a4b",
          gray: {
            900: "#121318",
            800: "#1a1c23",
            700: "#2d303e",
            600: "#474b60",
            500: "#6c728d",
            400: "#9da4c0",
          }
        },
      },
      fontFamily: {
        pixel: ['var(--font-pixel)', 'Courier New', 'monospace'],
        display: ['var(--font-display)', 'impact', 'sans-serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'pixel-sm': '2px 2px 0px 0px rgba(0,0,0,0.9)',
        'pixel': '4px 4px 0px 0px rgba(0,0,0,0.9)',
        'pixel-lg': '6px 6px 0px 0px rgba(0,0,0,0.9)',
        'pixel-orange': '4px 4px 0px 0px #ff5500',
        'pixel-glow': '0 0 15px rgba(255, 85, 0, 0.6)',
      },
      animation: {
        'scanline': 'scanline 8s linear infinite',
        'crt-flicker': 'crtFlicker 0.15s infinite',
        'pixel-pulse': 'pixelPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' }
        },
        crtFlicker: {
          '0%': { opacity: '0.97' },
          '50%': { opacity: '1' },
          '100%': { opacity: '0.98' }
        },
        pixelPulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.02)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        }
      }
    },
  },
  plugins: [],
};
