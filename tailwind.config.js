/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0052D9',
          hover: '#0957D9',
          active: '#366EF4',
        },
        background: {
          light: '#F3F3F3',
          white: '#FFFFFF',
          dark: '#242424',
        },
        functional: {
          success: '#2BA471',
          error: '#E34D59',
          warning: '#ED7B2F',
          info: '#0052D9',
        },
      },
      fontFamily: {
        sans: ['PingFang SC', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}
