import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        symbio: {
          cyan: "#00f5ff",
          magenta: "#ff1cf7",
          ink: "#081225"
        }
      },
      backgroundImage: {
        "grid-glow": "radial-gradient(circle at 20% 20%, rgba(0,245,255,0.18), transparent 45%), radial-gradient(circle at 80% 10%, rgba(255,28,247,0.16), transparent 40%), linear-gradient(to bottom, #ffffff, #f3f8ff)"
      },
      boxShadow: {
        glass: "0 8px 40px rgba(8,18,37,0.12)"
      },
      keyframes: {
        ripple: {
          "0%": { transform: "scale(0.9)", opacity: "0.5" },
          "100%": { transform: "scale(1.15)", opacity: "0" }
        }
      },
      animation: {
        ripple: "ripple 2.2s ease-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
