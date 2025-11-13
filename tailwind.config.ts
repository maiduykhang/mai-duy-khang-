import type { Config } from "tailwindcss";
// FIX: Changed require to import for tailwindcss/forms plugin to be compliant with TypeScript modules.
import forms from '@tailwindcss/forms';

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    forms,
  ],
};
export default config;