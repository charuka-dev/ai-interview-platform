import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#f0f4ff",
          100: "#e0e9ff",
          200: "#c7d7fe",
          300: "#a5bafd",
          400: "#8193fb",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4038ca",
          800: "#3530a3",
          900: "#302d82",
          950: "#1e1b4b",
        },
        surface: {
          DEFAULT: "#0f0f1a",
          1: "#14142b",
          2: "#1a1a35",
          3: "#21213f",
        },
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
