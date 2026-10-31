/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "#08090A",
          subtle: "#0D0E10",
        },
        panel: {
          DEFAULT: "#0F1012",
          elevated: "#131417",
        },
        surface: {
          DEFAULT: "#16171B",
          hover: "#1F2025",
          active: "#262830",
        },
        modal: {
          DEFAULT: "#121316",
          surface: "#16171B",
          recessed: "#0B0C0E",
        },
        hairline: {
          DEFAULT: "rgba(255, 255, 255, 0.08)",
          subtle: "rgba(255, 255, 255, 0.05)",
          strong: "rgba(255, 255, 255, 0.15)",
        },
        mongo: {
          DEFAULT: "#10B981",
          bright: "#00ED64",
          dark: "#059669",
        },
        guard: {
          DEFAULT: "#EF4444",
        },
      },
      fontFamily: {
        sans: ["Geist Sans", "Inter", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "JetBrains Mono", "monospace"],
      },
      boxShadow: {
        linear: "0 0 0 1px rgba(255, 255, 255, 0.08), 0 8px 24px -4px rgba(0, 0, 0, 0.6)",
        modal: "0 0 0 1px rgba(255, 255, 255, 0.1), 0 20px 48px -8px rgba(0, 0, 0, 0.8)",
      },
      zIndex: {
        "60": "60",
        "70": "70",
        "100": "100",
      },
    },
  },
  plugins: [],
};
