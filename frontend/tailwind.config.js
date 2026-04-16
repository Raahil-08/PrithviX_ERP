/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        prithvix: {
          primary: '#1A3C2B',
          'primary-hover': '#142F21',
          accent: '#D4A853',
          'accent-hover': '#B88E3B',
          light: '#F5F0E8',
          dark: '#0E1A14',
          surface: '#FFFFFF',
          'surface-dark': '#14251D',
          'surface-secondary': '#EAE5DC',
          'surface-secondary-dark': '#1E362A',
          'text-primary': '#0E1A14',
          'text-secondary': '#4A5D52',
          border: '#D8D3CB',
          'border-dark': '#2B4738',
          error: '#D35400',
          success: '#2E7D32',
        }
      },
      fontFamily: {
        serif: ['DM Serif Display', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
