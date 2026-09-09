import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Identidad Pasteur — azul marino con escala completa.
        brand: {
          DEFAULT: "#084878",
          50: "#eff6fc",
          100: "#d8e8f6",
          200: "#b3d0ec",
          300: "#7fb0de",
          400: "#4b8bcb",
          500: "#246bad",
          600: "#0f5590",
          700: "#084878",
          800: "#0a3a5e",
          900: "#082e4b",
          950: "#051d31",
        },
        accent: {
          DEFAULT: "#e2231a", // rojo Pasteur
          soft: "#fdecea",
          600: "#c81810",
        },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        soft: "0 2px 8px -2px rgb(15 23 42 / 0.08), 0 4px 16px -4px rgb(15 23 42 / 0.06)",
        pop: "0 8px 24px -6px rgb(8 72 120 / 0.18)",
        glow: "0 4px 14px -4px rgb(8 72 120 / 0.35), inset 0 1px 0 0 rgb(255 255 255 / 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
