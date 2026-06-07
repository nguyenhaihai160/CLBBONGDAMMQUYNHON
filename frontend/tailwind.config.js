/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pitch: '#16A34A',
        grass: '#22C55E',
        limeball: '#FFB020',
        brandGreen: '#16A34A',
        brandOrange: '#FF7A00',
        brandForest: '#064E3B',
      },
    },
  },
  plugins: [],
};
