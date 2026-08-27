'use strict';

const zlib = require('zlib');

function crcChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(typeData) >>> 0, 0);
  return Buffer.concat([length, typeData, crc]);
}

/**
 * Codifica un buffer RGBA (width*height*4 bytes) como PNG de 8 bits sin dependencias externas.
 */
function encodePNG(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // profundidad de bits
  ihdr[9] = 6; // tipo de color: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // sin filtro
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idatData = zlib.deflateSync(raw);

  return Buffer.concat([
    signature,
    crcChunk('IHDR', ihdr),
    crcChunk('IDAT', idatData),
    crcChunk('IEND', Buffer.alloc(0)),
  ]);
}

function createCanvas(width, height, backgroundColor) {
  const buffer = Buffer.alloc(width * height * 4);
  fillRect(buffer, width, height, 0, 0, width, height, backgroundColor);
  return buffer;
}

function fillRect(buffer, canvasWidth, canvasHeight, x0, y0, w, h, color) {
  const [r, g, b, a] = color;
  const x1 = Math.max(0, Math.min(canvasWidth, x0 + w));
  const y1 = Math.max(0, Math.min(canvasHeight, y0 + h));
  for (let y = Math.max(0, y0); y < y1; y++) {
    for (let x = Math.max(0, x0); x < x1; x++) {
      const i = (y * canvasWidth + x) * 4;
      buffer[i] = r;
      buffer[i + 1] = g;
      buffer[i + 2] = b;
      buffer[i + 3] = a;
    }
  }
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16),
    255,
  ];
}

module.exports = { encodePNG, createCanvas, fillRect, hexToRgb };
