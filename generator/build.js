'use strict';

const fs = require('fs');
const path = require('path');
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

/**
 * Extrae viewBox/transform/path de un SVG de un solo trazo (como el isotipo) para
 * poder reutilizar exactamente los mismos datos vectoriales en el partial
 * signature-mark, sin duplicar el path en más de un archivo del repo.
 */
function extractIsotipo(svgSource) {
  const viewBoxMatch = svgSource.match(/viewBox="([^"]+)"/);
  const transformMatch = svgSource.match(/<g transform="([^"]+)"/);
  const pathMatch = svgSource.match(/<path d="([^"]+)"/);
  return {
    viewBox: viewBoxMatch ? viewBoxMatch[1] : '0 0 494 540',
    transform: transformMatch ? transformMatch[1] : '',
    pathD: pathMatch ? pathMatch[1] : '',
  };
}

function buildVCard(prof, site) {
  const [nombre] = prof.nombre.split(' ');
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${prof.nombre};;;;`,
    `FN:${prof.nombre}`,
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
  const isotipo = extractIsotipo(fs.readFileSync(path.join(PUBLIC_DIR, 'img', 'lefinor-isotipo.svg'), 'utf8'));

  const partials = loadPartials();
  const layout = fs.readFileSync(path.join(TEMPLATES_DIR, 'layout.html'), 'utf8');

  const ciudades = [...new Set(propiedades.map((p) => p.ciudad))].sort();

  function renderPage(pageName, extraData, layoutData) {
    const pageTemplate = loadPage(pageName);
    const baseData = Object.assign(
      { site, profesionales, propiedades, publicaciones, ciudades, confianza, testimonios, isotipo },
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
        { propiedad, relacionadas },
        {
          title: `${propiedad.titulo} — ${site.siteName}`,
          description: propiedad.descripcion.slice(0, 160),
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

  // Tarjetas digitales + vCards
  for (const prof of profesionales) {
    const tarjetaUrl = `${site.domain}/tarjetas/${prof.slug}.html`;
    const qrSvg = generateQrSvg(tarjetaUrl, { darkColor: tokens.azul });
    writeFile(
      `tarjetas/${prof.slug}.html`,
      renderPage(
        'tarjeta',
        { profesional: prof, qrSvg },
        {
          title: `${prof.nombre} — Tarjeta digital ${site.siteName}`,
          description: `Tarjeta de contacto digital de ${prof.nombre}, ${prof.cargo}.`,
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

  console.log(`Sitio generado en ${DIST_DIR}`);
  console.log(`Páginas: ${allPaths.length + profesionales.length} | Propiedades: ${propiedades.length} | Publicaciones: ${publicaciones.length} | Profesionales: ${profesionales.length}`);
}

main();
