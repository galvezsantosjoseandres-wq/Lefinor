'use strict';

const qrcode = require('qrcode-generator');

/**
 * Genera un código QR como SVG estático (sin llamadas de red en el navegador).
 * Usa error correction 'M' (recuperación ~15%) y una zona de silencio de 4 módulos,
 * como recomienda la especificación QR para asegurar una lectura confiable.
 */
function generateQrSvg(text, { margin = 4, darkColor = '#0B1D33', lightColor = '#FFFFFF' } = {}) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();

  const count = qr.getModuleCount();
  const size = count + margin * 2;

  let path = '';
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) {
        path += `M${col + margin},${row + margin}h1v1h-1z`;
      }
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img">` +
    `<rect width="${size}" height="${size}" fill="${lightColor}"/>` +
    `<path d="${path}" fill="${darkColor}"/>` +
    `</svg>`
  );
}

module.exports = { generateQrSvg };
