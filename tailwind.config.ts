import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Identidad Pasteur
        brand: {
          DEFAULT: "#084878", // azul marino
          50: "#eef4fa",
          100: "#d6e4f2",
          600: "#0b5a94",
          700: "#084878",
          900: "#052d4b",
        },
        accent: {
          DEFAULT: "#e2231a", // rojo Pasteur
          soft: "#fdecea",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
