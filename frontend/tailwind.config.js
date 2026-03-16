/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0A0B0F",
          elevated: "#0D0E14",
          hover: "#12131A",
        },
        accent: {
          cyan: "#22D3EE",
          purple: "#A78BFA",
          green: "#34D399",
          amber: "#F59E0B",
        },
      },
      fontFamily: {
        display: ["Outfit", "Noto Kufi Arabic", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
        arabic: ["Noto Kufi Arabic", "Outfit", "sans-serif"],
      },
    },
  },
  plugins: [],
};
