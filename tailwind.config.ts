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
        // Östgötatrafiken-inspirerad palett + status
        otic: {
          primary: "#006B4A",
          primaryDark: "#004d36",
          secondary: "#2C5F2D",
          accent: "#97BE5A",
          surface: "#f0f4ef",
        },
        status: {
          red: "#DC2626",
          yellow: "#EAB308",
          green: "#16A34A",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
