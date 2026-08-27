'use strict';

/**
 * Genera un set de favicons (16x16, 32x32, 48x48 PNG) de respaldo, con un monograma "L"
 * en los colores de marca de Lefinor. Ejecutar con: node generator/assets/make-favicons.js
 * Los favicons definitivos del sitio se suben manualmente a public/favicon/; este script
 * solo sirve como referencia o para regenerar un set temporal si hiciera falta.
 */

const fs = require('fs');
const path = require('path');
const { encodePNG, createCanvas, fillRect, hexToRgb } = require('../lib/png');
const { loadColorTokens } = require('../lib/tokens');

const tokens = loadColorTokens();
const azul = hexToRgb(tokens.azul);
const dorado = hexToRgb(tokens.dorado);

const OUT_DIR = path.join(__dirname, '..', '..', 'public', 'favicon');
fs.mkdirSync(OUT_DIR, { recursive: true });

function drawL(size) {
  const canvas = createCanvas(size, size, azul);
  const barWidth = Math.max(1, Math.round(size * 0.16));
  const startX = Math.round(size * 0.28);
  const startY = Math.round(size * 0.2);
  const height = Math.round(size * 0.6);
  fillRect(canvas, size, size, startX, startY, barWidth, height, dorado);
  fillRect(canvas, size, size, startX, startY + height - barWidth, Math.round(size * 0.44), barWidth, dorado);
  return canvas;
}

[16, 32, 48].forEach((size) => {
  const pixels = drawL(size);
  const png = encodePNG(size, size, pixels);
  fs.writeFileSync(path.join(OUT_DIR, `favicon-${size}x${size}.png`), png);
  console.log(`Generado favicon-${size}x${size}.png`);
});
