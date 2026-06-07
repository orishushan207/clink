import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "party-bg": "#07070f",
        "party-surface": "#0d0d1e",
        "party-surface2": "#13132b",
        "party-border": "rgba(201, 162, 39, 0.2)",
        "party-gold": "#c9a227",
        "party-gold-light": "#e8c040",
        "party-gold-dark": "#a07a1a",
      },
      backgroundImage: {
        "party-gradient": "linear-gradient(135deg, #c9a227 0%, #e8a020 100%)",
        "party-gradient-soft":
          "linear-gradient(135deg, rgba(201,162,39,0.15) 0%, rgba(232,160,32,0.15) 100%)",
        "hero-gradient":
          "radial-gradient(ellipse at top, rgba(201,162,39,0.25) 0%, rgba(7,7,15,1) 70%)",
      },
      fontFamily: {
        hebrew: ["Heebo", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "float-in": "floatIn 0.6s ease-out",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(201,162,39,0.4)" },
          "50%": { boxShadow: "0 0 40px rgba(232,160,32,0.6)" },
        },
        floatIn: {
          from: { opacity: "0", transform: "translateY(30px) scale(0.95)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
    },
  },
  plugins: [
    function ({ addUtilities }: { addUtilities: (u: Record<string, Record<string, string>>) => void }) {
      addUtilities({
        ".scrollbar-hide": {
          "-ms-overflow-style": "none",
          "scrollbar-width": "none",
        },
        ".scrollbar-hide::-webkit-scrollbar": {
          display: "none",
        },
      });
    },
  ],
};
export default config;
