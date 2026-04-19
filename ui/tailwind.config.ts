import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        sanctum: {
          ink: "#1E3340",
          /** Primary content container background — darkened 25% from prior #243D4D */
          surface: "#1B2E3A",
          surface2: "#2C4A5E",
          accent: "#5B74A6",
          /** Secondary text — lightened vs prior #697F8C for WCAG contrast on surfaces */
          muted: "#9DB1BC",
          mist: "#F0F1F2",
          line: "#AAB9BF",
          /** Project name text — near-white with a cool blue hue */
          project: "#DCE6F5",
        },
        danger: {
          DEFAULT: "#C45C5C",
          dim: "#8f3d3d",
          surface: "rgba(196, 92, 92, 0.12)",
        },
        warning: {
          DEFAULT: "#D9A056",
          dim: "#a67a3a",
          surface: "rgba(217, 160, 86, 0.15)",
        },
        success: {
          DEFAULT: "#6B9C7A",
          surface: "rgba(107, 156, 122, 0.15)",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        logo: ["var(--font-sanctum-logo)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
