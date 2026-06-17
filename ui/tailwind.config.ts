import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        sanctum: {
          bg: "#0d1018",
          ink: "#0d1018",
          surface: "#131722",
          raised: "#1a2030",
          elevated: "#222a3d",
          surface2: "#1a2030",
          accent: "#d95c22",
          "accent-dark": "#b84a1b",
          "accent-soft": "rgba(217,92,34,0.13)",
          teal: "#2dd4bf",
          muted: "#8b93a7",
          faint: "#5c6378",
          mist: "#e8eaef",
          line: "rgba(255,255,255,0.08)",
          "line-strong": "rgba(255,255,255,0.14)",
          project: "#dce6f5",
          terminal: "#0a0d14",
        },
        danger: {
          DEFAULT: "#c45c5c",
          dim: "#8f3d3d",
          surface: "rgba(196, 92, 92, 0.12)",
        },
        warning: {
          DEFAULT: "#d9a056",
          dim: "#a67a3a",
          surface: "rgba(217, 160, 86, 0.15)",
        },
        success: {
          DEFAULT: "#36b37e",
          surface: "rgba(54, 179, 126, 0.12)",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sanctum-sans)",
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        display: [
          "var(--font-sanctum-display)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "var(--font-sanctum-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
        logo: ["var(--font-sanctum-display)", "ui-sans-serif", "sans-serif"],
      },
      borderRadius: {
        sanctum: "14px",
        "sanctum-sm": "9px",
      },
      boxShadow: {
        "sanctum-accent": "0 12px 30px -12px rgba(217,92,34,0.7)",
        "sanctum-card": "0 40px 80px -34px rgba(0,0,0,0.8)",
      },
    },
  },
  plugins: [],
};

export default config;
