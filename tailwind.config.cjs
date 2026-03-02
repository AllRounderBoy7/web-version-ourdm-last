/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx,jsx,js}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#0f172a",
          950: "#020617"
        }
      },
      backdropBlur: {
        glass: "18px"
      },
      boxShadow: {
        glass: "0 25px 80px rgba(0,0,0,0.45)"
      }
    }
  },
  plugins: []
};
