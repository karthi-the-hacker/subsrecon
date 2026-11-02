/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        tech: ['"Orbitron"', 'sans-serif'],
      },
      colors: {
        dark: {
          bg: "#04070F",
          sidebar: "#060B16",
          card: "#091224",
          "card-hover": "#0E1C38",
          border: "#152542",
          "border-bright": "#223B68",
          text: "#E6F4F1",
          muted: "#627D98",
        },
        primary: {
          DEFAULT: "#00FF88",
          hover: "#00E57A",
          light: "#33FFA0",
          dark: "#00B359",
          muted: "rgba(0, 255, 136, 0.15)",
        },
        cyber: {
          green: "#00FF88",
          cyan: "#00F0FF",
          blue: "#0099FF",
          amber: "#FFB000",
          crimson: "#FF2A5F",
          violet: "#9D4EDD",
          dim: "#061324",
        },
        success: {
          DEFAULT: "#00FF88",
          hover: "#00D672",
          light: "#5CFFAD",
        },
        warning: {
          DEFAULT: "#FFB000",
          hover: "#E69E00",
          light: "#FFC94D",
        },
        danger: {
          DEFAULT: "#FF2A5F",
          hover: "#E6154A",
          light: "#FF6B8B",
        },
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(0, 255, 136, 0.25)',
        'glow-md': '0 0 20px rgba(0, 255, 136, 0.35)',
        'glow-lg': '0 0 35px rgba(0, 255, 136, 0.45)',
        'glow-cyan': '0 0 20px rgba(0, 240, 255, 0.35)',
        'glow-crimson': '0 0 20px rgba(255, 42, 95, 0.35)',
        'cyber-card': '0 8px 32px 0 rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
        'cyber-glow': '0 0 25px rgba(0, 255, 136, 0.12), inset 0 0 15px rgba(0, 255, 136, 0.05)',
      },
      keyframes: {
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        cyberPulse: {
          '0%, 100%': { opacity: 1, filter: 'drop-shadow(0 0 8px rgba(0, 255, 136, 0.8))' },
          '50%': { opacity: 0.6, filter: 'drop-shadow(0 0 2px rgba(0, 255, 136, 0.3))' },
        },
        glitchFlicker: {
          '0%, 100%': { opacity: 1 },
          '92%': { opacity: 1 },
          '93%': { opacity: 0.8 },
          '94%': { opacity: 1 },
          '96%': { opacity: 0.9 },
          '97%': { opacity: 1 },
        },
      },
      animation: {
        'radar-sweep': 'radarSweep 4s linear infinite',
        'scanline': 'scanline 8s linear infinite',
        'cyber-pulse': 'cyberPulse 2.5s ease-in-out infinite',
        'glitch': 'glitchFlicker 6s infinite',
      },
    },
  },
  plugins: [],
};
