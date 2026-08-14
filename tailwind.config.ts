import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#08090d",
          900: "#0d0f16",
          850: "#12141d",
          800: "#171a25",
          700: "#232636",
          600: "#343850",
          500: "#4b5075",
        },
        line: "#232636",
        accent: {
          DEFAULT: "#7c6cf6",
          soft: "#a99dff",
          dim: "#3f3a75",
        },
        signal: {
          up: "#33d69f",
          warn: "#f5b94f",
          down: "#f45b69",
        },
        ink: {
          hi: "#f3f2fa",
          mid: "#a4a6bd",
          lo: "#63667f",
        },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: { xl2: "1.1rem" },
    },
  },
  plugins: [],
};
export default config;
