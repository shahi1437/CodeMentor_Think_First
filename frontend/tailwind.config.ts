import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#070B14",
          900: "#0B0F19",
          850: "#0F172A",
          800: "#131C31",
          700: "#1A2642",
          600: "#243254",
        },
        brand: {
          indigo: "#6366F1",
          "indigo-hover": "#4F46E5",
          teal: "#14B8A6",
          "teal-hover": "#0D9488",
          cyan: "#06B6D4",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "Courier New", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
