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
          black: "#050914",
          dark: "#07101D",
          navy: "#0A1424",
          purple: "#1b0d2b",
          brown: "#24130b",
          orange: {
            burnt: "#D94E16",
            fiery: "#FF5A16",
            bright: "#FF7A1A",
            glow: "#ff9900",
          },
          amber: "#F5A623",
          yellow: "#ffe600",
          cream: "#F4E6CE",
          cyan: "#18D8D0",
          cyanDark: "#0D7380",
          muted: "#91A0AE",
          green: "#00ff66",
          red: "#ff2a4b",
          gray: {
            900: "#07101D",
            800: "#0A1424",
            700: "#1e2638",
            600: "#474b60",
            500: "#6c728d",
            400: "#91A0AE",
          }
        },
      },
      fontFamily: {
        rajdhani: ['Rajdhani', 'sans-serif'],
        teko: ['Teko', 'sans-serif'],
        russo: ['"Russo One"', 'sans-serif'],
        montserrat: ['Montserrat', 'Outfit', 'sans-serif'],
        outfit: ['Outfit', 'Montserrat', 'sans-serif'],
        bebas: ['var(--font-bebas)', '"Bebas Neue"', 'Montserrat', 'sans-serif'],
        display: ['Rajdhani', 'Montserrat', 'sans-serif'],
        syne: ['var(--font-syne)', 'Syne', 'sans-serif'],
        pixel: ['var(--font-pixel)', '"Space Grotesk"', 'Outfit', 'sans-serif'],
        sans: ['var(--font-sans)', 'Outfit', 'Inter', 'system-ui', 'sans-serif'],
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
