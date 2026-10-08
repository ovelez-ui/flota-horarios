import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Identidad oficial Pasteur (Manual de Marca 2025): azul corporativo
        // #003b71 y deep navy #011a4b, con escala derivada.
        brand: {
          DEFAULT: "#003b71",
          50: "#eef3f8",
          100: "#d8e3ee",
          200: "#b6ccdf",
          300: "#86a7cb",
          400: "#4e7fae",
          500: "#1f5e9a",
          600: "#0a4f88",
          700: "#003b71",
          800: "#012a56",
          900: "#011a4b",
          950: "#010d26",
        },
        accent: {
          DEFAULT: "#e1251b", // rojo Pasteur (bright red)
          soft: "#f9d3d1",
          600: "#ad0f0a", // dark red
        },
      },
      fontFamily: {
        sans: ["Lato", "Arial", "Helvetica", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        soft: "0 2px 8px -2px rgb(15 23 42 / 0.08), 0 4px 16px -4px rgb(15 23 42 / 0.06)",
        pop: "0 8px 24px -6px rgb(0 59 113 / 0.20)",
        glow: "0 4px 14px -4px rgb(0 59 113 / 0.38), inset 0 1px 0 0 rgb(255 255 255 / 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
