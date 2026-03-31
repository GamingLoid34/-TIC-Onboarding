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
        // Modern blå accentpalett
        otic: {
          primary: "#2563eb",
          primaryDark: "#1d4ed8",
          secondary: "#3b82f6",
          accent: "#60a5fa",
          surface: "#f0f9ff",
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
