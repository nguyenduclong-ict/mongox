/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "#08090A",
          subtle: "#0B0F17",
        },
        panel: {
          DEFAULT: "#101216",
          elevated: "#12151B",
        },
        surface: {
          DEFAULT: "#181B22",
          hover: "#1E232D",
          active: "#252B37",
        },
        modal: {
          DEFAULT: "#1F2430",
        },
        hairline: {
          DEFAULT: "#1F2937",
          subtle: "rgba(255, 255, 255, 0.08)",
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
    },
  },
  plugins: [],
};
