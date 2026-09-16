'use strict';

module.exports = {
  // Además de las plantillas, se escanean los .js que arman clases de Tailwind como
  // strings literales en tiempo de ejecución (generator/build.js para la grilla de la
  // galería y las etiquetas de estado; public/js/main.js para el lightbox, los formularios
  // y las tarjetas de Academy). Así Tailwind las detecta automáticamente sin depender de un
  // safelist que haya que recordar mantener cada vez que se agregue una clase nueva ahí.
  // Esto solo funciona porque esas clases se arman como strings completos (o como opciones
  // completas dentro de un ternario/switch) — una clase ensamblada por concatenación de
  // fragmentos (ej. 'bg-' + color) seguiría sin ser detectable y necesitaría safelist.
  content: ['./templates/**/*.html', './generator/**/*.js', './public/js/**/*.js'],
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
