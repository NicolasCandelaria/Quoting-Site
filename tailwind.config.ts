import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#F1F5F9",
        "base-gradient": "#E2E8F0",
        "text-primary": "#0f172a",
        "text-secondary": "#334155",
        "text-tertiary": "#475569",
        accent: {
          DEFAULT: "#24186e",
          hover: "#1e1359",
          pressed: "#1a1052",
        },
        status: {
          draft: "#9CA3AF",
          internal: "#F59E0B",
          shared: "#24186e",
          finalized: "#10B981",
          error: "#EF4444",
        },
        "glass-panel": "rgba(255,255,255,0.95)",
        "glass-panel-subtle": "rgba(255,255,255,0.9)",
        "glass-border": "rgba(0,0,0,0.08)",
        "glass-border-strong": "rgba(0,0,0,0.12)",
        "glass-border-dashed": "rgba(0,0,0,0.2)",
        "active-bg": "rgba(36, 24, 110, 0.12)",
        "active-text": "#24186e",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "page-title": ["28px", { lineHeight: "36px" }],
        "section-title": ["20px", { lineHeight: "28px" }],
        "subsection-title": ["16px", { lineHeight: "24px" }],
        body: ["14px", { lineHeight: "20px" }],
        caption: ["12px", { lineHeight: "16px" }],
        "spec-label": ["13px", { lineHeight: "20px" }],
        "spec-value": ["14px", { lineHeight: "20px" }],
      },
      borderRadius: {
        panel: "14px",
        button: "8px",
        "image-container": "12px",
      },
      boxShadow: {
        glass: "0 4px 20px rgba(0,0,0,0.08)",
        "glass-card": "0 4px 24px rgba(0,0,0,0.06)",
        "glass-card-hover": "0 8px 32px rgba(0,0,0,0.12)",
      },
      backdropBlur: {
        panel: "16px",
        sidebar: "18px",
        "btn-secondary": "12px",
      },
      transitionDuration: {
        glass: "150ms",
      },
      transitionTimingFunction: {
        glass: "ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
