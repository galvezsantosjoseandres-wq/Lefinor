'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { render } = require('./lib/render');
const { generateQrSvg } = require('./lib/qr');
const { loadColorTokens } = require('./lib/tokens');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const TEMPLATES_DIR = path.join(ROOT, 'templates');
const PUBLIC_DIR = path.join(ROOT, 'public');
const DIST_DIR = path.join(ROOT, 'dist');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonDir(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath)
    .filter((f) => f.endsWith('.json'))
    .map((f) => readJson(path.join(dirPath, f)));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(relativePath, content) {
  const fullPath = path.join(DIST_DIR, relativePath);
  ensureDir(path.dirname(fullPath));
  fs.writeFileSync(fullPath, content, 'utf8');
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function buildTailwindCss() {
  const bin = path.join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'tailwindcss.cmd' : 'tailwindcss');
  const input = path.join(__dirname, 'tailwind-input.css');
  const output = path.join(DIST_DIR, 'css', 'tailwind.css');
  ensureDir(path.dirname(output));
  execFileSync(bin, ['-i', input, '-o', output, '--minify'], { cwd: ROOT, stdio: 'inherit' });
}

function loadPartials() {
  const dir = path.join(TEMPLATES_DIR, 'partials');
  const partials = {};
  for (const file of fs.readdirSync(dir)) {
    if (file.endsWith('.html')) {
      partials[path.basename(file, '.html')] = fs.readFileSync(path.join(dir, file), 'utf8');
    }
  }
  return partials;
}

function loadPage(name) {
  return fs.readFileSync(path.join(TEMPLATES_DIR, 'pages', `${name}.html`), 'utf8');
}

function slugSort(list) {
  return list.slice().sort((a, b) => (a.orden || 0) - (b.orden || 0));
}

const GALERIA_PREVIEW_MAX = 5;

// Clases de grilla para la galería según cuántos tiles de previsualización hay (1 a 5).
// CSS Grid coloca automáticamente los tiles secundarios en las celdas libres una vez que
// el tile principal reserva su columna/filas con row-span, así que nunca queda una celda
// vacía sin importar cuántas fotos tenga la propiedad.
function claseGaleria(previewCount) {
  switch (previewCount) {
    case 1:
      return { container: '', main: 'h-64 md:h-[420px] w-full rounded-xl overflow-hidden' };
    case 2:
      return {
        container: 'md:grid md:grid-cols-2 md:gap-1.5 md:h-[420px] rounded-xl overflow-hidden',
        main: 'h-64 md:h-auto',
      };
    case 3:
      return {
        container: 'md:grid md:grid-cols-[1.6fr_1fr] md:grid-rows-2 md:gap-1.5 md:h-[420px] rounded-xl overflow-hidden',
        main: 'h-64 md:h-auto md:row-span-2',
      };
    case 4:
      return {
        container: 'md:grid md:grid-cols-[1.6fr_1fr] md:grid-rows-3 md:gap-1.5 md:h-[420px] rounded-xl overflow-hidden',
        main: 'h-64 md:h-auto md:row-span-3',
      };
    default:
      return {
        container: 'md:grid md:grid-cols-[1.6fr_1fr_1fr] md:grid-rows-2 md:gap-1.5 md:h-[420px] rounded-xl overflow-hidden',
        main: 'h-64 md:h-auto md:row-span-2',
      };
  }
}

function tipoOperacionLabel(tipoOperacion) {
  if (tipoOperacion === 'venta') return 'Venta';
  if (tipoOperacion === 'alquiler') return 'Alquiler';
  return tipoOperacion || '';
}

function prepararGaleria(propiedad) {
  const galeria = (propiedad.galeria || []).map((item) => Object.assign({}, item, { mostrarFoto: item.tipo === 'foto' && Boolean(item.src) }));
  const galeriaMain = galeria[0]
    ? Object.assign({}, galeria[0], { previewIndex: 0 })
    : undefined;
  const galeriaSecundarias = galeria.slice(1, 4).map((item, i) => Object.assign({}, item, { previewIndex: i + 1 }));
  const galeriaQuintaTile = galeria[4] ? Object.assign({}, galeria[4], { previewIndex: 4 }) : undefined;
  const tieneMasFotos = galeria.length > GALERIA_PREVIEW_MAX;
  const fotosRestantes = tieneMasFotos ? galeria.length - GALERIA_PREVIEW_MAX : 0;
  const tieneMultiplesFotos = galeria.length > 1;
  const galeriaJson = JSON.stringify(galeria).replace(/</g, '\\u003c');
  const layout = claseGaleria(Math.min(galeria.length, GALERIA_PREVIEW_MAX));

  return Object.assign({}, propiedad, {
    galeria,
    galeriaMain,
    galeriaSecundarias,
    galeriaQuintaTile,
    tieneMasFotos,
    fotosRestantes,
    tieneMultiplesFotos,
    galeriaJson,
    galeriaContainerClass: layout.container,
    galeriaMainClass: layout.main,
    tipoOperacionLabel: tipoOperacionLabel(propiedad.tipo_operacion),
  });
}

function buildVCard(prof, site) {
  const nombreCompleto = prof.honorifico ? `${prof.honorifico} ${prof.nombre}` : prof.nombre;
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${prof.nombre};;;${prof.honorifico || ''};`,
    `FN:${nombreCompleto}`,
    `TITLE:${prof.cargo}`,
    `ORG:${site.siteName}`,
    `TEL;TYPE=CELL:${prof.telefono}`,
    `EMAIL:${prof.email}`,
    `URL:${site.domain}`,
    `ADR;TYPE=WORK:;;${site.address};;;;`,
    'END:VCARD',
    '',
  ].join('\r\n');
}

function main() {
  // Limpieza previa
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  ensureDir(DIST_DIR);

  const site = readJson(path.join(DATA_DIR, 'site.json'));
  const profesionales = slugSort(readJsonDir(path.join(DATA_DIR, 'profesionales')));
  const propiedades = readJsonDir(path.join(DATA_DIR, 'propiedades'));
  const publicaciones = readJsonDir(path.join(DATA_DIR, 'publicaciones')).sort(
    (a, b) => new Date(b.fecha) - new Date(a.fecha)
  );
  const confianzaPath = path.join(DATA_DIR, 'confianza.json');
  const testimoniosPath = path.join(DATA_DIR, 'testimonios.json');
  const confianza = fs.existsSync(confianzaPath) ? readJson(confianzaPath) : [];
  const testimonios = fs.existsSync(testimoniosPath) ? readJson(testimoniosPath) : [];

  const tokens = loadColorTokens();

  const partials = loadPartials();
  const layout = fs.readFileSync(path.join(TEMPLATES_DIR, 'layout.html'), 'utf8');

  const ciudades = [...new Set(propiedades.map((p) => p.ciudad))].sort();

  function renderPage(pageName, extraData, layoutData) {
    const pageTemplate = loadPage(pageName);
    const baseData = Object.assign(
      { site, profesionales, propiedades, publicaciones, ciudades, confianza, testimonios },
      extraData
    );
    const content = render(pageTemplate, baseData, partials);
    const pageLayoutData = Object.assign({}, baseData, layoutData, { content });
    return render(layout, pageLayoutData, partials);
  }

  // Páginas principales
  writeFile(
    'index.html',
    renderPage(
      'index',
      { destacadas: propiedades.filter((p) => p.destacada), ultimasPublicaciones: publicaciones.slice(0, 3) },
      {
        title: `${site.siteName} — ${site.slogan}`,
        description: `${site.siteName}: asesoría legal y financiera en Fantino, República Dominicana. ${site.slogan}.`,
        canonicalPath: '/',
      }
    )
  );

  writeFile(
    'quienes-somos.html',
    renderPage(
      'quienes-somos',
      {},
      {
        title: `Quiénes Somos — ${site.siteName}`,
        description: 'Conoce al equipo de abogados y asesores financieros de Lefinor Capital Group en Fantino, República Dominicana.',
        canonicalPath: '/quienes-somos.html',
      }
    )
  );

  writeFile(
    'servicios.html',
    renderPage(
      'servicios',
      {},
      {
        title: `Servicios Legales y Financieros — ${site.siteName}`,
        description: 'Servicios de asesoría legal y financiera de Lefinor Capital Group: derecho civil, inmobiliario, comercial, laboral, familia, migratorio y financiero.',
        canonicalPath: '/servicios.html',
      }
    )
  );

  writeFile(
    'academy.html',
    renderPage(
      'academy',
      {},
      {
        title: `Lefinor Academy — ${site.siteName}`,
        description: 'Talleres, cursos y diplomados de Lefinor Academy en Fantino, República Dominicana.',
        canonicalPath: '/academy.html',
      }
    )
  );

  writeFile(
    'propiedades.html',
    renderPage(
      'propiedades-list',
      {},
      {
        title: `Propiedades — ${site.siteName}`,
        description: 'Propiedades en venta y alquiler gestionadas por Lefinor Capital Group.',
        canonicalPath: '/propiedades.html',
      }
    )
  );

  writeFile(
    'publicaciones.html',
    renderPage(
      'publicaciones-list',
      {},
      {
        title: `Publicaciones — ${site.siteName}`,
        description: 'Artículos y publicaciones de Lefinor Capital Group sobre derecho y finanzas.',
        canonicalPath: '/publicaciones.html',
      }
    )
  );

  writeFile(
    'contacto.html',
    renderPage(
      'contacto',
      {},
      {
        title: `Contacto — ${site.siteName}`,
        description: `Contacta a ${site.siteName} en ${site.address}.`,
        canonicalPath: '/contacto.html',
      }
    )
  );

  writeFile(
    'terminos-de-uso.html',
    renderPage(
      'terminos',
      {},
      {
        title: `Términos de Uso — ${site.siteName}`,
        description: `Términos de uso del sitio web de ${site.siteName}.`,
        canonicalPath: '/terminos-de-uso.html',
      }
    )
  );

  writeFile(
    'politica-de-privacidad.html',
    renderPage(
      'privacidad',
      {},
      {
        title: `Política de Privacidad — ${site.siteName}`,
        description: `Política de privacidad del sitio web de ${site.siteName}.`,
        canonicalPath: '/politica-de-privacidad.html',
      }
    )
  );

  // Detalle de propiedades
  for (const propiedad of propiedades) {
    const relacionadas = propiedades.filter((p) => p.slug !== propiedad.slug && p.ciudad === propiedad.ciudad).slice(0, 3);
    writeFile(
      `propiedades/${propiedad.slug}.html`,
      renderPage(
        'propiedad-detail',
        { propiedad: prepararGaleria(propiedad), relacionadas },
        {
          title: `${propiedad.titulo} — ${site.siteName}`,
          description: propiedad.detalle_intro.slice(0, 160),
          canonicalPath: `/propiedades/${propiedad.slug}.html`,
        }
      )
    );
  }

  // Detalle de publicaciones
  for (const publicacion of publicaciones) {
    const relacionadas = publicaciones.filter((p) => p.slug !== publicacion.slug).slice(0, 3);
    writeFile(
      `publicaciones/${publicacion.slug}.html`,
      renderPage(
        'publicacion-detail',
        { publicacion, relacionadas },
        {
          title: `${publicacion.titulo} — ${site.siteName}`,
          description: publicacion.resumen,
          canonicalPath: `/publicaciones/${publicacion.slug}.html`,
        }
      )
    );
  }

  // Biografías del equipo + tarjetas digitales + vCards
  for (const prof of profesionales) {
    const nombreCompleto = prof.honorifico ? `${prof.honorifico} ${prof.nombre}` : prof.nombre;

    writeFile(
      `equipo/${prof.slug}.html`,
      renderPage(
        'profesional-detail',
        { profesional: prof },
        {
          title: `${nombreCompleto} — ${site.siteName}`,
          description: `${nombreCompleto}, ${prof.cargo} en ${prof.area}.`,
          canonicalPath: `/equipo/${prof.slug}.html`,
        }
      )
    );

    const tarjetaUrl = `${site.domain}/tarjetas/${prof.slug}.html`;
    const qrSvg = generateQrSvg(tarjetaUrl, { darkColor: tokens.azul });
    writeFile(
      `tarjetas/${prof.slug}.html`,
      renderPage(
        'tarjeta',
        { profesional: prof, qrSvg },
        {
          title: `${nombreCompleto} — Tarjeta digital ${site.siteName}`,
          description: `Tarjeta de contacto digital de ${nombreCompleto}, ${prof.cargo}.`,
          canonicalPath: `/tarjetas/${prof.slug}.html`,
          bodyClass: 'tarjeta-page',
        }
      )
    );
    writeFile(`tarjetas/${prof.slug}.vcf`, buildVCard(prof, site));
  }

  // JSON de apoyo para filtros/buscador del lado del cliente
  writeFile('data/propiedades.json', JSON.stringify(propiedades, null, 2));
  writeFile('data/publicaciones.json', JSON.stringify(publicaciones, null, 2));

  // sitemap.xml
  const staticPaths = [
    '/',
    '/quienes-somos.html',
    '/servicios.html',
    '/academy.html',
    '/propiedades.html',
    '/publicaciones.html',
    '/contacto.html',
    '/terminos-de-uso.html',
    '/politica-de-privacidad.html',
  ];
  const dynamicPaths = [
    ...propiedades.map((p) => `/propiedades/${p.slug}.html`),
    ...publicaciones.map((p) => `/publicaciones/${p.slug}.html`),
    ...profesionales.map((p) => `/equipo/${p.slug}.html`),
  ];
  const allPaths = [...staticPaths, ...dynamicPaths];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${allPaths
    .map((p) => `  <url><loc>${site.domain}${p}</loc></url>`)
    .join('\n')}\n</urlset>\n`;
  writeFile('sitemap.xml', sitemap);

  // robots.txt
  writeFile('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${site.domain}/sitemap.xml\n`);

  // Assets estáticos
  copyDir(PUBLIC_DIR, DIST_DIR);

  // CSS de Tailwind compilado en build time (reemplaza el script runtime de cdn.tailwindcss.com)
  buildTailwindCss();

  console.log(`Sitio generado en ${DIST_DIR}`);
  console.log(`Páginas: ${allPaths.length + profesionales.length} | Propiedades: ${propiedades.length} | Publicaciones: ${publicaciones.length} | Profesionales: ${profesionales.length}`);
}

main();
