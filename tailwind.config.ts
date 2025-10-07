import type { Config } from "tailwindcss";
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        emerald: {
          DEFAULT: "#10b981"
        }
      },
      boxShadow: {
        card: "0 2px 10px rgba(0,0,0,0.08)"
      }
    }
  },
  plugins: []
} satisfies Config;
