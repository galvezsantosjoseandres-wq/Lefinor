'use strict';

module.exports = {
  content: ['./templates/**/*.html'],
  theme: {
    extend: {
      colors: {
        'lefinor-azul': 'var(--azul)',
        'lefinor-azul-2': 'var(--azul-2)',
        'lefinor-dorado': 'var(--dorado)',
        'lefinor-dorado-soft': 'var(--dorado-soft)',
        'lefinor-gris': 'var(--gris)',
        'lefinor-neutro': 'var(--neutro)',
      },
      fontFamily: {
        sans: ['Montserrat', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
};
