module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dce8ff',
          200: '#bdd3ff',
          300: '#8fb4ff',
          400: '#5c8ffb',
          500: '#2f6df3',
          600: '#1a5ce6',
          700: '#1649bd',
          800: '#173f98',
          900: '#183779',
        },
        navy: {
          600: '#1b2e5c',
          700: '#13244d',
          800: '#0d1b3e',
          900: '#0a1530',
          950: '#060e22',
        },
        ink: '#0f1d3d',
        violet: { 550: '#6d5ef0' },
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      boxShadow: {
        card: '0 1px 2px rgba(15,29,61,.04), 0 6px 18px rgba(15,29,61,.05)',
        pop: '0 12px 40px rgba(15,29,61,.16)',
      },
      borderRadius: { xl2: '14px' },
    },
  },
};
