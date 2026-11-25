/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './user/**/*.html',
    './admin/**/*.html',
    './public/js/**/*.js'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif']
      },
      colors: {
        stitch: {
          primary: '#1D4ED8',
          primaryHover: '#1E40AF',
          primarySoft: '#EFF6FF',
          success: '#059669',
          successSoft: '#ECFDF5',
          warning: '#D97706',
          warningSoft: '#FFFBEB',
          dark: '#0F172A'
        }
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 4px 16px -2px rgba(15, 23, 42, 0.05)'
      }
    }
  },
  plugins: []
};
