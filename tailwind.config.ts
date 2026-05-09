import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Warm neutrals — base palette for glassmorphism surfaces.
        bg: "#FAF7F2",
        ink: "#1A1A1A",
        mute: "#6B6B68",
        // Single orange accent — reserved for winner + Share (§5.3).
        orange: {
          DEFAULT: "#F97316",
          wash: "rgba(249, 115, 22, 0.12)",
        },
        // Dark pill.
        pill: "#0F0F0F",
      },
      fontFamily: {
        sans: ['"Helvetica Neue"', "Helvetica", "Arial", "sans-serif"],
      },
      borderRadius: {
        glass: "24px",
        cell: "12px",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(20, 15, 10, 0.06)",
        pill: "0 2px 8px rgba(0, 0, 0, 0.15)",
      },
      backdropBlur: {
        glass: "20px",
      },
      backdropSaturate: {
        glass: "110",
      },
    },
  },
  plugins: [],
};

export default config;
