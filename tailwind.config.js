/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors')

module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ...colors, // Standard-Tailwind-Farben inklusive green-600 etc.
        // Hauptfarben
        primary: {
          DEFAULT: '#D83434',      // Crimson Red
          dark: '#B02A2A',         // Dunkleres Rot
          light: '#E86464',        // Helleres Rot
        },
        secondary: {
          DEFAULT: '#3498DB',      // Sky Blue
          dark: '#2980B9',         // Dunkleres Blau
          light: '#5DADE2',        // Helleres Blau
        },
        tertiary: {
          DEFAULT: '#27AE60',      // Emerald Green
          dark: '#1F8B4C',         // Dunkleres Grün
          light: '#52BE80',        // Helleres Grün
        },
        accent: {
          DEFAULT: '#F6C91C',      // Golden Sun
          dark: '#D4AC0D',         // Dunkleres Gold
          light: '#F9D44C',        // Helleres Gold
        },
        // Neutrale Farben
        neutral: '#2E2E2E',        // Charcoal for text
        background: '#F9F9F9',     // Cloud White
        border: '#DDDDDD',         // Soft Gray
        error: '#E74C3C',          // Fehlerfarbe
        // Weitere Farben
        // KEIN green und purple hier überschreiben!
        
        // Neue Farbpalette für Melsdörper Vagelscheeten
        melsdorf: {
          orange: '#F2A03D',       // Buttons, CTA-Hintergrund
          red: '#E7432C',          // Überschriften, Kontraste
          green: '#33665B',        // Navigation, Textfarbe
          beige: '#F2E4C2',        // Hintergrundsektionen
        },
      },
    },
  },
  plugins: [],
}
