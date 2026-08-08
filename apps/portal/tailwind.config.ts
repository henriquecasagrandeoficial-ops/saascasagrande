import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./systems/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        ink: {
          50: "#f4f6f8",
          100: "#e3e8ee",
          200: "#c5d0dc",
          300: "#9aabc0",
          400: "#6b829d",
          500: "#516782",
          600: "#3f5269",
          700: "#344356",
          800: "#2d3948",
          900: "#1a222d",
          950: "#0f141b",
        },
        copper: {
          400: "#d4a574",
          500: "#c4894a",
          600: "#a66d35",
        },
        coffee: {
          50: "#fdf2f7",
          100: "#fce7f0",
          200: "#f9cfe0",
          300: "#f4a6c6",
          400: "#ec72a3",
          500: "#e14b85",
          600: "#cf2d6c",
          700: "#ad2159",
          800: "#8a1c49",
          900: "#5d1432",
        },
        brand: {
          50: "#f0f7f6",
          100: "#d8ebe9",
          200: "#b3d6d2",
          300: "#7ab5af",
          400: "#45948c",
          500: "#1f6f68",
          600: "#034742",
          700: "#023a36",
          800: "#022e2b",
          900: "#011f1d",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
