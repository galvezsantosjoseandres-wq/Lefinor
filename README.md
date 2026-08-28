# Sitio web de Lefinor Capital Group

Generador estático propio en Node.js (sin dependencias externas) para el sitio de
[Lefinor Capital Group](https://lefinor.com). Combina archivos de datos en `data/` con
plantillas HTML en `templates/` para producir el sitio final en `dist/`.

## Cómo funciona

```
data/            Un JSON por sección/entidad (site, profesionales, propiedades, publicaciones, etc.)
templates/       Layout, parciales (header, footer, whatsapp, cookies) y una plantilla por página
public/          Assets estáticos que se copian tal cual a dist/ (imágenes, favicons, js/main.js)
generator/       El generador (build.js), el motor de plantillas y utilidades (PNG, favicons)
dist/            Salida generada (no se versiona; se regenera con `npm run build`)
```

Ejecutar el generador:

```bash
npm run build
```

Esto produce en `dist/`:

- Todas las páginas HTML del sitio (Inicio, Quiénes Somos, Servicios, Academy, Propiedades,
  Publicaciones, Contacto, Legal).
- Una página de detalle por propiedad (`dist/propiedades/{slug}.html`) y por publicación
  (`dist/publicaciones/{slug}.html`).
- Una tarjeta digital y su vCard por profesional (`dist/tarjetas/{slug}.html` y `.vcf`), con
  su código QR generado como SVG estático en build time (`generator/lib/qr.js`, sin llamadas
  a servicios externos en el navegador).
- `dist/data/propiedades.json` y `dist/data/publicaciones.json` para el buscador/filtro del
  lado del cliente (`public/js/main.js`).
- `dist/sitemap.xml` y `dist/robots.txt`.

## Cómo agregar contenido

- **Nuevo profesional:** crear `data/profesionales/{slug}.json` (usar uno existente como
  plantilla) y su foto en `public/img/equipo/`.
- **Nueva propiedad:** crear `data/propiedades/{slug}.json` y sus imágenes en
  `public/img/propiedades/`. Aparece automáticamente en el listado, el filtro y el buscador.
- **Nueva publicación:** crear `data/publicaciones/{slug}.json` y sus imágenes en
  `public/img/publicaciones/`.
- **Testimonios / empresas que confían:** agregar entradas a `data/testimonios.json` y
  `data/confianza.json` (arrays vacíos por defecto — las secciones correspondientes del Inicio
  se ocultan automáticamente mientras estén vacías). Solo agregar testimonios y logos con
  autorización expresa del cliente/empresa.

## Colores de marca

`public/css/tokens.css` es la fuente única de verdad de los colores de marca (`--azul`,
`--azul-2`, `--dorado`, `--dorado-soft`, `--gris`, `--blanco`, `--neutro`). Cualquier ajuste de
color se hace editando ese archivo — el Tailwind config del `<head>` y los scripts de build en
Node (QR, favicons, vía `generator/lib/tokens.js`) leen de ahí, no de valores sueltos repetidos
en cada plantilla.

## Despliegue

Cloudflare Pages debe ejecutar `npm run build` como comando de build y publicar el directorio
`dist/`. GitHub Actions (`.github/workflows/build.yml`) corre el mismo generador en cada Pull
Request como verificación de que el sitio compila sin errores.

## Pendientes conocidos (ver instrucciones del proyecto)

- Logo oficial: ya integrado el logo vectorizado real y aprobado
  (`public/img/lefinor-isotipo.svg`, `lefinor-logo-principal.svg`, `lefinor-logo-blanco.svg`,
  `lefinor-logo-sobre-navy.svg` y `lefinor-logo-horizontal.svg`). Header usa la versión
  horizontal (dorado, fondo claro); footer y tarjeta digital usan la versión blanca
  (ícono + texto, fondo oscuro).
- Favicons: `public/favicon/` está vacía a la espera de que se suban manualmente los 3 PNG
  (16×16, 32×32, 48×48) definitivos vía la interfaz web de GitHub.
- Contenido detallado de Lefinor Academy (talleres, cursos, diplomados).
- Confirmación del cliente sobre dónde debe aparecer el slogan oficial (por ahora aparece en
  el hero de Inicio y en los encabezados internos de cada página).
- Activación de Cloudflare R2 para alojar video de propiedades (`propiedad.video` en el JSON
  ya soporta una URL de video cuando esté disponible).
- **Envío real de los formularios de contacto:** por ser un sitio 100% estático (sin backend
  ni base de datos), los formularios actualmente arman un `mailto:` prellenado hacia
  `info@lefinor.com` al enviarse. Si se prefiere entrega directa sin depender del cliente de
  correo del visitante, se puede conectar una Cloudflare Pages Function más adelante.
- Decisión final del dominio canónico (`www` vs. apex) para configurar la redirección en
  Cloudflare.

## Desarrollado por

[Activosweb.com](https://activosweb.com)
