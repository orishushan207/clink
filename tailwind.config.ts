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
        "party-bg": "#1f1219",
        "party-surface": "#2b1922",
        "party-surface2": "#37212c",
        "party-border": "rgba(224, 184, 168, 0.18)",
        "party-gold": "#d9a98e",
        "party-gold-light": "#f0cdb8",
        "party-gold-dark": "#b9826a",
      },
      backgroundImage: {
        "party-gradient": "linear-gradient(135deg, #d9a98e 0%, #c98e8a 100%)",
        "party-gradient-soft":
          "linear-gradient(135deg, rgba(217,169,142,0.15) 0%, rgba(201,142,138,0.15) 100%)",
        "hero-gradient":
          "radial-gradient(ellipse at top, rgba(217,169,142,0.22) 0%, rgba(31,18,25,1) 70%)",
      },
      fontFamily: {
        hebrew: ["Heebo", "system-ui", "sans-serif"],
        display: ["'Playfair Display'", "serif"],
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
          "0%, 100%": { boxShadow: "0 0 20px rgba(217,169,142,0.4)" },
          "50%": { boxShadow: "0 0 40px rgba(201,142,138,0.6)" },
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
