/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "surface": "#fff8f1",
        "surface-dim": "#e2d9cb",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#fcf2e4",
        "surface-container": "#f6edde",
        "surface-container-high": "#f0e7d9",
        "surface-container-highest": "#eae1d3",
        "on-surface": "#1f1b12",
        "on-surface-variant": "#4e4634",
        "outline": "#807662",
        "outline-variant": "#d1c5ae",
        "primary": "#755b00",
        "on-primary": "#ffffff",
        "primary-container": "#f6c844",
        "on-primary-container": "#6c5400",
        "secondary": "#79573f",
        "on-secondary": "#ffffff",
        "secondary-container": "#ffd1b3",
        "on-secondary-container": "#7a5840",
        "tertiary": "#00677e",
        "tertiary-container": "#6adcff",
        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "background": "#fff8f1",
        "on-background": "#1f1b12",
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.5rem",
        full: "9999px",
      },
      fontFamily: {
        sans: ["Quicksand", "sans-serif"],
      },
    },
  },
  plugins: [],
}