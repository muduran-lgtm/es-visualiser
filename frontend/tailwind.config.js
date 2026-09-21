/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        kibana: {
          dark: '#121316',
          panel: '#181920',
          border: '#2d3139',
          accent: '#00bfb3',
          yellow: '#fec514',
          blue: '#3274d9',
          pink: '#f04e98'
        }
      }
    },
  },
  plugins: [],
}
