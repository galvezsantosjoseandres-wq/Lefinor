'use strict';

module.exports = {
  content: ['./templates/**/*.html'],
  theme: {
    extend: {
      colors: {
        // rgb(var(--x-rgb) / <alpha-value>) — el patrón que necesita Tailwind v3 para poder
        // generar variantes de opacidad (/50, /15, etc.) sobre un color definido vía variable
        // CSS. Un plain var(--azul) que ya es un hex completo no admite modificador de opacidad.
        'lefinor-azul': 'rgb(var(--azul-rgb) / <alpha-value>)',
        'lefinor-azul-2': 'rgb(var(--azul-2-rgb) / <alpha-value>)',
        'lefinor-dorado': 'rgb(var(--dorado-rgb) / <alpha-value>)',
        'lefinor-dorado-soft': 'rgb(var(--dorado-soft-rgb) / <alpha-value>)',
        'lefinor-gris': 'rgb(var(--gris-rgb) / <alpha-value>)',
        'lefinor-neutro': 'rgb(var(--neutro-rgb) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Montserrat', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
};
