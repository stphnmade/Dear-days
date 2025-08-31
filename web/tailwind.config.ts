import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx,mdx}",
    "./src/components/**/*.{ts,tsx,mdx}",
    "./src/ui/**/*.{ts,tsx,mdx}", // ← important for PastelBlobsBg.tsx
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
