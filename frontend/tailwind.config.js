/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#0A0A0F',
        electricBlue: '#4F8EF7',
        cyanNeon: '#00D4FF',
      },
    },
  },
  plugins: [],
}