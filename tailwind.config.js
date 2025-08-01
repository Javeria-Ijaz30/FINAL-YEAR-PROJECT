/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      animation: {
        l3: "l3 1s infinite linear",
        slideInFromLeft: "slideInFromLeft 0.7s ease-out forwards",
        fadeIn: "fadeIn 1s ease-out forwards", // Adding a fadeIn animation
      },
      keyframes: {
        l3: {
          "20%": { backgroundPosition: "0% 0%, 50% 50%, 100% 50%" },
          "40%": { backgroundPosition: "0% 100%, 50% 0%, 100% 50%" },
          "60%": { backgroundPosition: "0% 50%, 50% 100%, 100% 0%" },
          "80%": { backgroundPosition: "0% 50%, 50% 50%, 100% 100%" },
        },
        slideInFromLeft: {
          "0%": {
            transform: "translateX(-10%)",
            opacity: 0,
          },
          "100%": {
            transform: "translateX(0)",
            opacity: 1,
          },
        },
        fadeIn: { // New fadeIn animation
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
      },
      colors: {
        customBlue: "#1E3A8A", // Adding a custom blue color for reusability
        customGray: "#D1D5DB", // Adding a custom gray color for reusability
      },
      fontFamily: {
        customFont: ['"Roboto"', 'sans-serif'], // Adding a custom font
      },
      spacing: {
        '18': '4.5rem', // Adding custom spacing values
        '72': '18rem',
      },
    },
  },
  plugins: [],
};
