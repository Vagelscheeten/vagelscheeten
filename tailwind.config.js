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
    screens: {
      'sm': '640px',
      'md': '920px',  // Geändert von 768px auf 920px
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        ...colors, // Standard-Tailwind-Farben inklusive green-600 etc.
        // CONTRAST COLORS for destructive actions
        destructive: '#E7432C',
        'destructive-foreground': '#fff',
        // Hauptfarben
        primary: {
          DEFAULT: '#111',      // Schwarz für Buttons
          dark: '#000',         // Tiefschwarz für Hover
          light: '#222',        // Dunkleres Grau für leichte States
        },
        secondary: {
          DEFAULT: '#111',      // Schwarz für Buttons
          dark: '#000',         // Tiefschwarz für Hover
          light: '#222',        // Dunkleres Grau für leichte States
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
        // Button-Textfarbe (weiß für alle Buttons)
        'primary-foreground': '#fff',
        'secondary-foreground': '#fff',
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
