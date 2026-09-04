'use strict';

/**
 * Única fuente de verdad para las categorías de "publicaciones": su etiqueta legible y su
 * imagen de portada por defecto (usada cuando el artículo no trae imagen_portada propia).
 * Agregar una categoría nueva es una sola línea aquí — nada que tocar en las plantillas.
 */
const CATEGORIAS = {
  institucional: { label: 'Institucional', imagenDefault: '/img/publicaciones/categorias/institucional.jpg' },
  'derecho-civil': { label: 'Derecho Civil', imagenDefault: '/img/publicaciones/categorias/derecho-civil.jpg' },
  'derecho-penal': { label: 'Derecho Penal', imagenDefault: '/img/publicaciones/categorias/derecho-penal.jpg' },
  finanzas: { label: 'Finanzas', imagenDefault: '/img/publicaciones/categorias/finanzas.jpg' },
};

function categoriaInfo(slug) {
  return CATEGORIAS[slug] || { label: slug, imagenDefault: null };
}

module.exports = { CATEGORIAS, categoriaInfo };
