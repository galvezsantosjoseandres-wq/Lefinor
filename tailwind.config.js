'use strict';

module.exports = {
  content: ['./templates/**/*.html'],
  // La grilla de la galería de propiedades arma sus clases dinámicamente en
  // generator/build.js (según cuántas fotos tenga cada propiedad) y las inyecta en el HTML
  // ya generado, así que el escaneo de contenido de Tailwind (que solo lee las plantillas
  // fuente, no dist/) nunca las ve como texto literal. Sin este safelist, Tailwind nunca
  // genera las reglas y la grilla se rompe silenciosamente en producción.
  safelist: [
    'md:grid',
    'md:grid-cols-2',
    'md:grid-cols-[1.6fr_1fr]',
    'md:grid-cols-[1.6fr_1fr_1fr]',
    'md:grid-rows-2',
    'md:grid-rows-3',
    'md:row-span-2',
    'md:row-span-3',
    'md:gap-1.5',
    'md:h-auto',
    'md:h-[420px]',
    // Etiqueta de estado "Impartido" de los cursos de Academy: la clase se arma como
    // string en generator/build.js (detalle) y public/js/main.js (tarjetas del listado),
    // nunca aparece como texto literal en una plantilla .html, así que el escaneo de
    // contenido de Tailwind nunca la detecta sin este safelist.
    'bg-lefinor-gris',
  ],
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
