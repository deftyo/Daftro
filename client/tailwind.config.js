/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          1:  '#1A73E8',  // Google blue — accent, active nav
          2:  '#1967D2',  // Blue darker — button hover
          3:  '#5F6368',  // Google grey — secondary text
          4:  '#1A73E8',  // Blue — focus / hover border
          5:  '#F8F9FA',  // Surface — header background
          6:  '#F8F9FA',  // Background — page
          7:  '#FFFFFF',  // Surface — cards, inputs
          8:  '#E0E0E0',  // Border
          9:  '#F29900',  // Amber — warning, partial
          10: '#D93025',  // Red — error, incident
        },
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(60,64,67,0.15), 0 1px 2px 0 rgba(60,64,67,0.10)',
        'card-hover': '0 2px 6px 2px rgba(60,64,67,0.15), 0 1px 2px 0 rgba(60,64,67,0.10)',
      },
    },
  },
  plugins: [],
};
