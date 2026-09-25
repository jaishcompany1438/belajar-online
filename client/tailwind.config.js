/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#19324d",
        ocean: "#39739d",
        "ocean-dark": "#285a80",
        "ocean-soft": "#e8f1f7",
        cloud: "#f4f7fb"
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 8px 25px rgba(39, 76, 104, .08)",
        lift: "0 18px 45px rgba(39, 76, 104, .08)"
      }
    }
  },
  plugins: []
};
