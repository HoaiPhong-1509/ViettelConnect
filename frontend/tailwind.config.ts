import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#E60000", // đỏ Viettel
      },
    },
  },
  plugins: [],
};

export default config;