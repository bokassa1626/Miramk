/** Identité visuelle : bleu ciel, acier froid et couleurs sémantiques pour les états */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        steel: { 50: '#F5F7F8', 100: '#EEF1F2', 200: '#DDE2E5', 300: '#C4CCD1', 400: '#9AA6AD', 500: '#6F7D86', 600: '#525F67', 700: '#3A454C', 800: '#273137', 900: '#1B252B' },
        brand: { 50: '#F0F9FF', 100: '#E0F2FE', 500: '#0EA5E9', 600: '#0284C7', 700: '#0369A1', 800: '#075985' },
        cure: { 50: '#FCEEF0', 100: '#F7D6DA', 500: '#C42B3B', 600: '#B3202F', 700: '#951A27' },
        leaf: { 50: '#E8F5EF', 600: '#1F7A5A', 700: '#17604A' },
        amber2: { 50: '#FBF1DF', 600: '#B26A00', 700: '#8F5500' },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
