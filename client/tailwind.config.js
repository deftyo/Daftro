/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          1:  '#006466',
          2:  '#065a60',
          3:  '#0b525b',
          4:  '#144552',
          5:  '#1b3a4b',
          6:  '#212f45',
          7:  '#272640',
          8:  '#312244',
          9:  '#3e1f47',
          10: '#4d194d',
        },
      },
    },
  },
  plugins: [],
};
