'use strict';

const fs = require('fs');
const path = require('path');

const TOKENS_PATH = path.join(__dirname, '..', '..', 'public', 'css', 'tokens.css');

/**
 * Lee public/css/tokens.css y extrae las variables --nombre: #hex; del bloque :root
 * como un objeto plano en camelCase (ej. --dorado-soft -> doradoSoft). Este archivo
 * es la única fuente de verdad para los colores de marca: tanto el Tailwind config
 * (en el navegador, vía var(--nombre)) como el código Node de build (QR, favicons)
 * deben leer de aquí para no duplicar valores hexadecimales.
 */
function loadColorTokens() {
  const css = fs.readFileSync(TOKENS_PATH, 'utf8');
  const tokens = {};
  const re = /--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g;
  let match;
  while ((match = re.exec(css)) !== null) {
    const camelKey = match[1].replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
    tokens[camelKey] = match[2];
  }
  return tokens;
}

module.exports = { loadColorTokens, TOKENS_PATH };
