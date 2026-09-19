import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        nmsa: {
          navy: "#120670",
          "navy-dark": "#0b0447",
          gold: "#FFDE00",
          "gold-dark": "#E6C700",
          gray: "#F4F5F8",
          "gray-dark": "#6B7280",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        premium: "0 4px 24px rgba(18, 6, 112, 0.08)",
        "premium-lg": "0 12px 40px rgba(18, 6, 112, 0.14)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
