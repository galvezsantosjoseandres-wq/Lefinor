'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const vCardsJS = require('vcards-js');
const { render } = require('./lib/render');
const { generateQrSvg } = require('./lib/qr');
const { loadColorTokens } = require('./lib/tokens');
const { categoriaInfo } = require('./lib/categorias-publicaciones');

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

const GALERIA_IMG_EXTS = { jpg: 'foto', jpeg: 'foto', png: 'foto', webp: 'foto' };
const GALERIA_VIDEO_EXTS = { mp4: 'video', mov: 'video', webm: 'video' };
const GALERIA_MEDIA_EXTS = Object.assign({}, GALERIA_IMG_EXTS, GALERIA_VIDEO_EXTS);

// Detecta automáticamente la galería de una propiedad a partir de los archivos en
// public/img/propiedades/<slug>/, en vez de un array "galeria" escrito a mano en el JSON
// (que podía desincronizarse de los archivos reales). Orden: por el número al inicio del
// nombre del archivo (numérico, no alfabético -- para que "10.jpg" no quede antes que
// "2.jpg"). Tipo: por la extensión (foto: jpg/jpeg/png/webp, video: mp4/mov/webm). El
// archivo número 1 es siempre la portada, sea foto o video.
//
// Para un elemento alojado externamente (ej. un video servido desde Cloudflare R2 en vez
// de committeado al repo), se usa un archivo puntero local del mismo número
// ("3.mp4.url" en vez de "3.mp4") cuyo único contenido es la URL remota -- mantiene el
// mismo criterio de orden/tipo por extensión sin subir el binario al repo.
function leerGaleriaPropiedad(slug) {
  const dir = path.join(PUBLIC_DIR, 'img', 'propiedades', slug);
  let archivos = [];
  try {
    archivos = fs.readdirSync(dir);
  } catch (e) {
    return [];
  }

  const porNumero = new Map();

  for (const nombre of archivos) {
    let match = /^(\d+)\.([A-Za-z0-9]+)\.url$/.exec(nombre);
    let numero;
    let ext;
    let esRemoto;
    if (match) {
      numero = parseInt(match[1], 10);
      ext = match[2].toLowerCase();
      esRemoto = true;
    } else {
      match = /^(\d+)\.([A-Za-z0-9]+)$/.exec(nombre);
      if (!match) continue; // no sigue la convención de numeración: se ignora
      numero = parseInt(match[1], 10);
      ext = match[2].toLowerCase();
      esRemoto = false;
    }

    const tipo = GALERIA_MEDIA_EXTS[ext];
    if (!tipo) continue; // extensión desconocida: se ignora

    if (porNumero.has(numero)) {
      console.warn(
        `⚠ Galería de "${slug}": el número ${numero} está repetido entre "${porNumero.get(numero).archivo}" y "${nombre}" -- se ignora "${nombre}".`
      );
      continue;
    }

    const src = esRemoto
      ? fs.readFileSync(path.join(dir, nombre), 'utf8').trim()
      : `/img/propiedades/${slug}/${nombre}`;

    porNumero.set(numero, { tipo, src, archivo: nombre });
  }

  const numeros = Array.from(porNumero.keys()).sort((a, b) => a - b);

  if (!numeros.length) {
    console.warn(`⚠ Galería de "${slug}": no se encontró ningún archivo de foto/video en la carpeta.`);
    return [];
  }
  if (numeros[0] !== 1) {
    console.warn(`⚠ Galería de "${slug}": no hay archivo número 1 -- la portada será "${porNumero.get(numeros[0]).archivo}".`);
  } else if (porNumero.get(1).tipo === 'video') {
    console.warn(
      `⚠ [${slug}]: el archivo #1 de la galería es un video (${porNumero.get(1).archivo}).\n` +
        '  Los videos no se pueden usar como imagen de portada -- verifica que esto sea intencional,\n' +
        '  o renumera para que una foto ocupe el puesto #1.'
    );
  }
  for (let i = 0; i < numeros.length - 1; i++) {
    if (numeros[i + 1] !== numeros[i] + 1) {
      console.warn(`⚠ Galería de "${slug}": hay un salto en la numeración entre ${numeros[i]} y ${numeros[i + 1]}.`);
    }
  }

  return numeros.map((n) => {
    const item = porNumero.get(n);
    return { tipo: item.tipo, src: item.src };
  });
}

// La portada (usada en tarjetas de listado/relacionadas) es siempre el archivo número 1
// de la galería detectada -- ya no un campo aparte en el JSON, que podía quedar
// desincronizado del contenido real de la carpeta.
function prepararPropiedadBase(propiedad) {
  const galeria = leerGaleriaPropiedad(propiedad.slug);
  return Object.assign({}, propiedad, {
    galeria,
    portada: galeria.length ? galeria[0].src : undefined,
  });
}

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
  // Cada elemento de propiedad.galeria (detectada por leerGaleriaPropiedad) siempre trae
  // un tipo y un src reales -- ya no existe el caso "video/foto sin archivo todavía".
  const galeria = (propiedad.galeria || []).map((item) =>
    Object.assign({}, item, {
      mostrarFoto: item.tipo === 'foto',
      mostrarVideo: item.tipo === 'video',
    })
  );
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

// Genera el vCard con la librería vcards-js en vez de armar el string a mano: se encarga del
// plegado de línea (máx. 75 caracteres por línea, como exige el estándar) y de la codificación
// base64 correcta del campo PHOTO — un vCard mal formado hace que algunos teléfonos rechacen la
// importación por completo.
function buildVCard(prof, site) {
  const nombreCompleto = prof.honorifico ? `${prof.honorifico} ${prof.nombre}` : prof.nombre;
  const [primerNombre, ...resto] = prof.nombre.trim().split(/\s+/);
  const card = vCardsJS();
  card.firstName = primerNombre || '';
  card.lastName = resto.join(' ');
  card.namePrefix = prof.honorifico || '';
  card.formattedName = nombreCompleto;
  card.organization = site.siteName;
  card.title = prof.cargo;
  card.cellPhone = prof.telefono_personal || prof.telefono;
  card.workEmail = prof.email;
  card.url = site.domain;
  card.workAddress.street = site.address;

  const fotoPath = path.join(PUBLIC_DIR, prof.foto);
  if (fs.existsSync(fotoPath)) {
    card.photo.embedFromFile(fotoPath);
  }

  return card.getFormattedString();
}

const MESES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

// Convierte "26 de agosto, 2026" a un número ordenable (20260826). Si no matchea el
// formato esperado, devuelve 0 para que quede al final en vez de romper el sort.
function fechaEspanolAOrden(fecha) {
  if (!fecha) return 0;
  const match = /(\d{1,2}) de (\w+),?\s*(\d{4})/i.exec(fecha);
  if (!match) return 0;
  const dia = Number(match[1]);
  const mes = MESES_ES.indexOf(match[2].toLowerCase());
  const anio = Number(match[3]);
  if (mes === -1) return 0;
  return anio * 10000 + (mes + 1) * 100 + dia;
}

// Convierte un teléfono local dominicano ("849-258-5991") al formato que espera wa.me
// (código de país + solo dígitos, ej. "18492585991") — mismo criterio ya usado para
// site.whatsappNumber a partir de site.phone en site.json.
function whatsappNumeroDesde(telefonoLocal) {
  return '1' + String(telefonoLocal).replace(/\D/g, '');
}

// Las URLs de mapa de cada oficina se calculan a partir de sus coordenadas GPS (única fuente de
// verdad) en vez de guardarse como campos aparte en el JSON — así nunca pueden desincronizarse
// si alguien actualiza las coordenadas pero olvida actualizar la URL. Se usan lat/lng en vez de
// la dirección en texto porque Google no siempre geolocaliza con precisión direcciones de
// interior de plaza/local (ej. "Segundo Nivel, Módulo 200"); las coordenadas sí garantizan el
// pin en el punto exacto. `direccion` se mantiene solo para mostrarla legible en pantalla.
//
// mapsEmbedUrl (el iframe) siempre se calcula por coordenadas -- un link maps.app.goo.gl no es
// embebible de forma confiable. mapsUrl (el botón externo "Abrir en Google Maps") usa el link
// corto ya verificado en Google Maps (mapsUrlVerificado) cuando la oficina lo tiene, en vez del
// link genérico por coordenadas; si no lo tiene, se sigue construyendo por coordenadas como
// siempre.
function prepararOficina(oficina) {
  const coordenadas = `${oficina.lat},${oficina.lng}`;
  return Object.assign({}, oficina, {
    mapsEmbedUrl: `https://www.google.com/maps?q=${coordenadas}&output=embed`,
    mapsUrl: oficina.mapsUrlVerificado || `https://www.google.com/maps/search/?api=1&query=${coordenadas}`,
  });
}

function truncar(texto, maxLength) {
  if (!texto || texto.length <= maxLength) return texto || '';
  return texto.slice(0, maxLength).trim().replace(/[.,;:]?\s*\S*$/, '') + '…';
}

function prepararCurso(curso, profesionales) {
  const instructorBase = profesionales.find((p) => p.slug === curso.instructor_id);
  const instructor = instructorBase
    ? {
        slug: instructorBase.slug,
        honorifico: instructorBase.honorifico,
        nombre: instructorBase.nombre,
        cargo: instructorBase.cargo,
        foto: instructorBase.foto,
        fotoAlt: instructorBase.fotoAlt,
        bioExtracto: truncar(instructorBase.bioCompleta, 160),
      }
    : null;
  const disponible = curso.estado === 'disponible';

  return Object.assign({}, curso, {
    instructor,
    disponible,
    estadoLabel: disponible ? 'Disponible' : 'Impartido',
    estadoBadgeClass: disponible ? 'bg-lefinor-dorado text-lefinor-azul' : 'bg-lefinor-gris text-white',
  });
}

function prepararPublicacion(publicacion, profesionales) {
  const info = categoriaInfo(publicacion.categoria);
  const portada = publicacion.imagen_portada || info.imagenDefault;
  const autorBase = publicacion.autor_id ? profesionales.find((p) => p.slug === publicacion.autor_id) : null;
  const autor = autorBase
    ? {
        slug: autorBase.slug,
        honorifico: autorBase.honorifico,
        nombre: autorBase.nombre,
        cargo: autorBase.cargo,
        foto: autorBase.foto,
        fotoAlt: autorBase.fotoAlt,
        bioExtracto: truncar(autorBase.bioCompleta, 160),
      }
    : null;

  return Object.assign({}, publicacion, {
    portada,
    categoriaLabel: info.label,
    autor,
  });
}

function main() {
  // Limpieza previa
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  ensureDir(DIST_DIR);

  const site = readJson(path.join(DATA_DIR, 'site.json'));
  const profesionales = slugSort(readJsonDir(path.join(DATA_DIR, 'profesionales')));
  const propiedades = readJsonDir(path.join(DATA_DIR, 'propiedades'))
    .filter((x) => x.visible !== false)
    .map(prepararPropiedadBase);
  const publicaciones = readJsonDir(path.join(DATA_DIR, 'publicaciones'))
    .filter((x) => x.visible !== false)
    .sort((a, b) => fechaEspanolAOrden(b.fecha) - fechaEspanolAOrden(a.fecha))
    .map((p) => prepararPublicacion(p, profesionales));
  const academyCursos = readJsonDir(path.join(DATA_DIR, 'academy'))
    .filter((x) => x.visible !== false)
    .sort((a, b) => fechaEspanolAOrden(b.fecha) - fechaEspanolAOrden(a.fecha))
    .map((c) => prepararCurso(c, profesionales));
  const confianzaPath = path.join(DATA_DIR, 'confianza.json');
  const testimoniosPath = path.join(DATA_DIR, 'testimonios.json');
  const oficinasPath = path.join(DATA_DIR, 'oficinas.json');
  const confianza = fs.existsSync(confianzaPath) ? readJson(confianzaPath) : [];
  const testimonios = fs.existsSync(testimoniosPath) ? readJson(testimoniosPath) : [];
  const oficinas = (fs.existsSync(oficinasPath) ? readJson(oficinasPath) : []).map(prepararOficina);

  const tokens = loadColorTokens();

  const partials = loadPartials();
  const layout = fs.readFileSync(path.join(TEMPLATES_DIR, 'layout.html'), 'utf8');

  const ciudades = [...new Set(propiedades.map((p) => p.ciudad))].sort();
  const categoriasDisponibles = [...new Set(publicaciones.map((p) => p.categoria))].map((slug) => ({
    slug,
    label: categoriaInfo(slug).label,
  }));

  function renderPage(pageName, extraData, layoutData) {
    const pageTemplate = loadPage(pageName);
    const baseData = Object.assign(
      { site, profesionales, propiedades, publicaciones, academyCursos, ciudades, confianza, testimonios, oficinas },
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
        title: site.siteName,
        description:
          'Asesoría legal y financiera integral en República Dominicana: derecho civil, inmobiliario, comercial y familia. Conoce también Lefinor Academy, nuestras propiedades y publicaciones.',
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
        title: `Quiénes Somos | ${site.siteName}`,
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
        title: `Servicios Legales y Financieros | ${site.siteName}`,
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
        title: `Lefinor Academy | ${site.siteName}`,
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
        title: `Propiedades | ${site.siteName}`,
        description: 'Propiedades en venta y alquiler gestionadas por Lefinor Capital Group.',
        canonicalPath: '/propiedades.html',
      }
    )
  );

  writeFile(
    'publicaciones.html',
    renderPage(
      'publicaciones-list',
      { categoriasDisponibles },
      {
        title: `Publicaciones | ${site.siteName}`,
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
        title: `Contacto | ${site.siteName}`,
        description: `Contacta a ${site.siteName} en nuestras sedes de ${oficinas.map((o) => o.nombre.replace(/^Sede /, '')).join(' y ')}.`,
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
        title: `Términos de Uso | ${site.siteName}`,
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
        title: `Política de Privacidad | ${site.siteName}`,
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
          title: `${propiedad.titulo} | ${site.siteName}`,
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
          title: `${publicacion.titulo} | ${site.siteName}`,
          description: publicacion.extracto,
          canonicalPath: `/publicaciones/${publicacion.slug}.html`,
        }
      )
    );
  }

  // Detalle de cursos de Academy
  for (const curso of academyCursos) {
    writeFile(
      `academy/${curso.id}.html`,
      renderPage(
        'academy-curso-detail',
        { curso },
        {
          title: `${curso.titulo} | ${site.siteName}`,
          description: (curso.descripcion[0] || '').slice(0, 160),
          canonicalPath: `/academy/${curso.id}.html`,
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
          title: `${nombreCompleto} | ${site.siteName}`,
          description: `${nombreCompleto}, ${prof.cargo} en ${prof.area}.`,
          canonicalPath: `/equipo/${prof.slug}.html`,
        }
      )
    );

    const tarjetaUrl = `${site.domain}/tarjetas/${prof.slug}.html`;
    const qrSvg = generateQrSvg(tarjetaUrl, { darkColor: tokens.azul });
    const mensajeWhatsappTarjeta = `Hola, me gustaría contactar a ${nombreCompleto} de ${site.siteName}.`;
    const whatsappNumeroTarjeta = whatsappNumeroDesde(prof.telefono_personal || prof.telefono);
    // La tarjeta digital es una página autónoma (sin header/navegación del sitio, mismo
    // criterio que 404.html): se renderiza directo, sin pasar por layout.html.
    writeFile(
      `tarjetas/${prof.slug}.html`,
      render(
        loadPage('tarjeta'),
        {
          site,
          profesional: prof,
          oficinas,
          qrSvg,
          whatsappNumeroTarjeta,
          mensajeWhatsappTarjetaCodificado: encodeURIComponent(mensajeWhatsappTarjeta),
          title: `${nombreCompleto} | Tarjeta digital ${site.siteName}`,
          description: `Tarjeta de contacto digital de ${nombreCompleto}, ${prof.cargo}.`,
          canonicalPath: `/tarjetas/${prof.slug}.html`,
        },
        partials
      )
    );
    writeFile(`tarjetas/${prof.slug}.vcf`, buildVCard(prof, site));
  }

  // JSON de apoyo para filtros/buscador del lado del cliente
  writeFile('data/propiedades.json', JSON.stringify(propiedades, null, 2));
  writeFile('data/publicaciones.json', JSON.stringify(publicaciones, null, 2));
  writeFile('data/academy.json', JSON.stringify(academyCursos, null, 2));

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
    ...academyCursos.map((c) => `/academy/${c.id}.html`),
    ...profesionales.map((p) => `/equipo/${p.slug}.html`),
  ];
  const allPaths = [...staticPaths, ...dynamicPaths];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${allPaths
    .map((p) => `  <url><loc>${site.domain}${p}</loc></url>`)
    .join('\n')}\n</urlset>\n`;
  writeFile('sitemap.xml', sitemap);

  // robots.txt
  writeFile('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${site.domain}/sitemap.xml\n`);

  // Página 404: pantalla de error autónoma (sin header/footer del layout principal),
  // servida automáticamente por Cloudflare Pages para cualquier ruta no encontrada.
  writeFile(
    '404.html',
    render(
      loadPage('404'),
      {
        site,
        title: `Página no encontrada | ${site.siteName}`,
        description: 'La página que buscas no existe o fue movida. Vuelve al inicio o explora las publicaciones de Lefinor Capital Group.',
        canonicalPath: '/404.html',
      },
      partials
    )
  );

  // Assets estáticos
  copyDir(PUBLIC_DIR, DIST_DIR);

  // CSS de Tailwind compilado en build time (reemplaza el script runtime de cdn.tailwindcss.com)
  buildTailwindCss();

  console.log(`Sitio generado en ${DIST_DIR}`);
  console.log(`Páginas: ${allPaths.length + profesionales.length} | Propiedades: ${propiedades.length} | Publicaciones: ${publicaciones.length} | Cursos Academy: ${academyCursos.length} | Profesionales: ${profesionales.length}`);
}

main();
