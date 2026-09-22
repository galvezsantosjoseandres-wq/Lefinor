// Worker de Cloudflare que sirve los archivos estáticos generados en dist/ (vía el binding
// de assets) e intercepta únicamente POST /api/contacto para procesar los formularios de
// Inicio y Contacto: valida los campos, aplica un honeypot anti-spam y un límite de tasa
// opcional por IP (vía KV, si está configurado), y envía el mensaje por correo con Resend.
// No sustituye la conexión de Academy a Google Apps Script — Academy sigue intacta y no pasa
// por este Worker en absoluto (su formulario llama directo a script.google.com).

const DESTINATION_EMAIL = 'info@lefinor.com';
const FROM_EMAIL = 'Lefinor Capital Group <formulario@lefinor.com>';
const ALLOWED_ORIGINS = ['https://lefinor.com', 'https://www.lefinor.com'];
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SECONDS = 15 * 60;
const MAX_LENGTHS = { nombre: 100, correo: 150, telefono: 30, mensaje: 2000, origen: 60 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Hoy, si una petición no trae cabecera Origin (curl, un script, cualquier cliente que no
// sea un navegador), la validación de origen de manejarContacto se salta entera. Exigirla
// cierra ese hueco, pero rechazar envíos legítimos costaría leads reales, así que queda
// desactivado hasta poder probarlo fuera de Chromium.
// Verificado con Playwright (22/09/2026): un fetch POST mismo-origen desde Chromium SÍ
// envía Origin, así que activarlo no rompería el formulario ahí. No se pudo verificar en
// Safari ni en Firefox (no están disponibles en el entorno de auditoría). Poner en true
// solo después de comprobarlo en staging con esos dos navegadores.
const EXIGIR_ORIGIN = false;

// Las cabeceras se añaden aquí, en el Worker, y no en un archivo _headers: el Worker es el
// único camino por el que se sirve el sitio, así que este es el punto donde el control es
// verificable directamente en el código, sin depender de que la plataforma interprete un
// archivo aparte.
// La CSP va en modo Report-Only a propósito: el sitio carga Google Fonts, GA4, Clarity, el
// embed de Maps y script.google.com, y una CSP en modo bloqueo desplegada a ciegas rompería
// alguna de esas piezas. Report-Only no restringe nada — solo reporta lo que restringiría.
// OJO: sin una directiva report-uri/report-to (que necesitaría un endpoint que recolecte los
// informes), las violaciones solo aparecen en la consola de DevTools del navegador; no se
// están recolectando en ningún lado.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  // 'unsafe-inline' es necesario hoy: hay <script> en línea (configuración de gtag, snippet
  // de Clarity, variables window.__LEFINOR_*). Quitarlo exige refactorizarlos primero.
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.clarity.ms",
  // 'unsafe-inline' es necesario aquí porque el JS asigna estilos en línea a los elementos
  // (carrusel: style.transform; tarjetas: style.backgroundImage).
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  "connect-src 'self' https://script.google.com https://www.google-analytics.com https://*.google-analytics.com https://*.clarity.ms",
  "frame-src https://www.google.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const CABECERAS_DE_SEGURIDAD = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Content-Security-Policy-Report-Only': CSP_REPORT_ONLY,
};

// La respuesta que devuelve env.ASSETS.fetch() trae las cabeceras inmutables, así que hay
// que copiarla para poder añadir las propias.
function conCabecerasDeSeguridad(respuesta) {
  const copia = new Response(respuesta.body, respuesta);
  for (const nombre of Object.keys(CABECERAS_DE_SEGURIDAD)) {
    copia.headers.set(nombre, CABECERAS_DE_SEGURIDAD[nombre]);
  }
  return copia;
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Quita caracteres de control y recorta a la longitud máxima permitida. Los saltos de línea
// (\n, \r) se quitan también por defecto — nombre/correo/teléfono/origen son campos de una
// sola línea, y como "nombre" y "origen" se usan tal cual en el asunto del correo, un salto
// de línea ahí serviría para inyectar contenido adicional. Solo "mensaje" los conserva
// (permitirSaltosDeLinea), ya que sí puede ser un texto de varias líneas legítimo.
function sanearTexto(valor, longitudMaxima, opciones) {
  if (typeof valor !== 'string') return '';
  const permitirSaltosDeLinea = Boolean(opciones && opciones.permitirSaltosDeLinea);
  const patron = permitirSaltosDeLinea ? /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g : /[\x00-\x1F\x7F]/g;
  const limpio = valor.replace(patron, '').trim();
  return limpio.slice(0, longitudMaxima);
}

function escaparHtml(valor) {
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Sin un namespace de KV configurado, el límite de tasa simplemente no se aplica —
// el formulario sigue funcionando con normalidad, solo sin esa protección extra.
async function dentroDelLimiteDeTasa(env, ip) {
  if (!env.RATE_LIMIT_KV) return true;
  const clave = `contacto:${ip}`;
  const actual = await env.RATE_LIMIT_KV.get(clave);
  const conteo = actual ? parseInt(actual, 10) : 0;
  if (conteo >= RATE_LIMIT_MAX) return false;
  await env.RATE_LIMIT_KV.put(clave, String(conteo + 1), { expirationTtl: RATE_LIMIT_WINDOW_SECONDS });
  return true;
}

async function manejarContacto(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405);
  }

  const origin = request.headers.get('Origin');
  if (EXIGIR_ORIGIN && !origin) {
    return jsonResponse({ ok: false, error: 'origen_no_permitido' }, 403);
  }
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return jsonResponse({ ok: false, error: 'origen_no_permitido' }, 403);
  }

  let datos;
  try {
    datos = await request.json();
  } catch (error) {
    return jsonResponse({ ok: false, error: 'json_invalido' }, 400);
  }

  // Honeypot: los bots suelen rellenar todos los campos, incluido este, que un visitante
  // real nunca ve ni completa. Se responde éxito falso para no delatarlo, sin enviar nada.
  if (sanearTexto(datos.pagina_web, 200)) {
    return jsonResponse({ ok: true }, 200);
  }

  const nombre = sanearTexto(datos.nombre, MAX_LENGTHS.nombre);
  const correo = sanearTexto(datos.correo, MAX_LENGTHS.correo);
  const telefono = sanearTexto(datos.telefono, MAX_LENGTHS.telefono);
  const mensaje = sanearTexto(datos.mensaje, MAX_LENGTHS.mensaje, { permitirSaltosDeLinea: true });
  const origen = sanearTexto(datos.origen, MAX_LENGTHS.origen) || 'Formulario de contacto';

  if (!nombre || !correo || !mensaje) {
    return jsonResponse({ ok: false, error: 'campos_requeridos' }, 400);
  }
  if (!EMAIL_RE.test(correo)) {
    return jsonResponse({ ok: false, error: 'correo_invalido' }, 400);
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'desconocida';
  if (!(await dentroDelLimiteDeTasa(env, ip))) {
    return jsonResponse({ ok: false, error: 'demasiados_intentos' }, 429);
  }

  if (!env.RESEND_API_KEY) {
    return jsonResponse({ ok: false, error: 'envio_no_configurado' }, 500);
  }

  const cuerpoHtml = [
    `<p><strong>Origen:</strong> ${escaparHtml(origen)}</p>`,
    `<p><strong>Nombre:</strong> ${escaparHtml(nombre)}</p>`,
    `<p><strong>Correo:</strong> ${escaparHtml(correo)}</p>`,
    `<p><strong>Teléfono:</strong> ${telefono ? escaparHtml(telefono) : '(no proporcionado)'}</p>`,
    '<p><strong>Mensaje:</strong></p>',
    `<p>${escaparHtml(mensaje).replace(/\n/g, '<br>')}</p>`,
  ].join('\n');

  const respuestaResend = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [DESTINATION_EMAIL],
      reply_to: correo,
      subject: `${origen} — ${nombre}`,
      html: cuerpoHtml,
    }),
  });

  if (!respuestaResend.ok) {
    return jsonResponse({ ok: false, error: 'envio_fallido' }, 502);
  }

  return jsonResponse({ ok: true }, 200);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/contacto') {
      return manejarContacto(request, env);
    }
    return conCabecerasDeSeguridad(await env.ASSETS.fetch(request));
  },
};
