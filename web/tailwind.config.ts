import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx,mdx}",
    "./src/components/**/*.{ts,tsx,mdx}",
    "./src/ui/**/*.{ts,tsx,mdx}",
  ],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
