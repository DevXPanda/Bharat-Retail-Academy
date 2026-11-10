// One palette for every portal. Change a value here and the whole platform follows.
//   Royal Blue  #2563EB  primary actions, links, focus
//   Sage Green  #2D725E  growth, success, teacher identity
//   Midnight Navy #14243A text, sidebars, dark surfaces
//   Soft Sage   #EEF4F0  calm surfaces and highlights
//   Light Background #F8FAFC  page canvas
const royal = {
  50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa',
  500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a',
};

const sage = {
  50: '#eef4f0', 100: '#dce9e1', 200: '#bad3c6', 300: '#8fb7a3', 400: '#5e9680',
  500: '#3f7f69', 600: '#2d725e', 700: '#265f4f', 800: '#204c40', 900: '#1b3e35',
};

const navy = {
  50: '#f2f5f9', 100: '#e1e7ef', 200: '#c3cfdf', 300: '#93a6bf', 400: '#62799a',
  500: '#44597a', 600: '#2f4668', 700: '#223652', 800: '#1b2e47', 900: '#14243a', 950: '#0d1827',
};

module.exports = {
  theme: {
    extend: {
      colors: {
        brand: sage,
        blue: sage,
        sage,
        navy,
        // Success greens across the app use the sage palette; violet becomes a calm slate-blue.
        emerald: sage,
        violet: { 50: '#f1f4f9', 100: '#e2e8f1', 200: '#c8d2e2', 300: '#a3b3cb', 400: '#7a8fb0', 500: '#5b7195', 550: '#4f6588', 600: '#44597a', 700: '#38496a', 800: '#2c3a54', 900: '#202b40' },
        ink: '#14243a',
        canvas: '#f8fafc',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Poppins"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,36,58,.05), 0 8px 24px -12px rgba(20,36,58,.10)',
        lift: '0 2px 4px rgba(20,36,58,.06), 0 16px 32px -12px rgba(20,36,58,.16)',
        pop: '0 16px 48px -12px rgba(20,36,58,.28)',
      },
      borderRadius: { xl2: '16px' },
    },
  },
};
