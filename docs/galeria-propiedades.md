# Galería de propiedades: detección automática por carpeta

La galería de cada propiedad (fotos y videos) ya no se declara a mano en el JSON de la
propiedad. El generador (`generator/build.js`, función `leerGaleriaPropiedad`) la construye
leyendo directamente el contenido de:

```
public/img/propiedades/<slug-de-la-propiedad>/
```

## Convención de nombres

Cada archivo se nombra `<número>.<extensión>`, por ejemplo:

```
1.png
2.png
3.mp4
```

- **Orden**: por el número al inicio del nombre, en orden numérico (no alfabético) — así
  `10.jpg` no queda antes que `2.jpg`.
- **Tipo**: por la extensión del archivo.
  - Foto: `jpg`, `jpeg`, `png`, `webp`
  - Video: `mp4`, `mov`, `webm`
- **Portada**: siempre el archivo número `1`, sea foto o video. Se usa como imagen de fondo
  en las tarjetas de propiedades (listado, relacionadas, etc.) en todo el sitio.

Ningún JSON de propiedad necesita declarar su galería ni su portada — ambas se calculan solo
a partir de lo que exista en la carpeta.

## Archivos puntero: medios alojados externamente (ej. Cloudflare R2)

Cuando un video (o cualquier medio) está alojado externamente en vez de vivir como archivo
committeado en el repositorio — por ejemplo un video real servido desde Cloudflare R2, para
no subir un binario pesado al repo — se usa un **archivo puntero local**.

Un archivo puntero sigue el patrón:

```
<número>.<extensión-real>.url
```

Por ejemplo, para el video de `apartamento-moca`:

```
public/img/propiedades/apartamento-moca/3.mp4.url
```

Su contenido es una sola línea de texto plano: la URL remota completa.

```
https://videos.lefinor.com/lefinor/propiedades/apartamento-moca/prueba.mp4
```

Nada de binario — es literalmente un archivo `.txt` con otro nombre.

### Cómo lo interpreta el build

`leerGaleriaPropiedad(slug)` recorre los archivos de la carpeta y, para cada nombre, primero
prueba el patrón de puntero:

```js
/^(\d+)\.([A-Za-z0-9]+)\.url$/
```

Contra `"3.mp4.url"` esto captura:

| Grupo | Valor  | Significado                          |
|-------|--------|---------------------------------------|
| 1     | `3`    | número de orden en la galería         |
| 2     | `mp4`  | extensión real → determina el tipo    |

Si el nombre **no** matchea ese patrón (por ejemplo `"1.png"`), se prueba el patrón normal de
archivo local:

```js
/^(\d+)\.([A-Za-z0-9]+)$/
```

En ambos casos, la extensión capturada (`mp4`, `png`, etc.) es la que decide el tipo
(`foto` o `video`) — el `.url` en sí nunca participa en esa decisión, solo es la señal de
"este archivo es un puntero, no el medio real".

### De dónde sale el `src`

- Archivo local (`1.png`): el `src` es la ruta pública de siempre —
  `/img/propiedades/<slug>/1.png`.
- Archivo puntero (`3.mp4.url`): el build **lee el contenido del archivo** con
  `fs.readFileSync(...).trim()` y usa ese texto directamente como `src`.

```js
const src = esRemoto
  ? fs.readFileSync(path.join(dir, nombre), 'utf8').trim()
  : `/img/propiedades/${slug}/${nombre}`;
```

El elemento que termina en el array de galería es idéntico en forma sin importar el origen:

```json
{ "tipo": "video", "src": "https://videos.lefinor.com/lefinor/propiedades/apartamento-moca/prueba.mp4" }
```

A partir de ahí (lightbox, miniaturas, tile de portada, etc.) nada distingue si ese `src`
vino de un archivo local o de un puntero — es una URL de video como cualquier otra.

### El número sigue contando para el orden y las validaciones

El `3` en `3.mp4.url` participa en las mismas reglas que cualquier archivo real:

- Determina su posición en el orden final de la galería.
- Si otro archivo de la misma carpeta usa el mismo número (real o puntero), el build **no
  falla en silencio**: imprime una advertencia indicando la propiedad y los archivos en
  conflicto, e ignora el duplicado.
- Si hay un salto en la numeración (ej. existen `1` y `3` pero no `2`), también se advierte
  en consola.

### Por qué el video de `apartamento-moca` es el número 3 y no el 1

La regla "portada = siempre el archivo número 1" se aplica sin excepción, sea foto o video.
Un video no se puede usar como `background-image` de una tarjeta (no renderiza nada), así
que si el video ocupara el número 1, la portada de esa propiedad se rompería visualmente en
todo el sitio. Por eso el video quedó numerado *después* de las 2 fotos existentes
(`1.png`, `2.png` → `3.mp4.url`): una foto real sigue siendo la portada, y el video pasa a
ser el último elemento de la galería/lightbox en vez del primero.

## Agregar un nuevo video alojado externamente (paso a paso)

1. Sube el video al hosting externo (R2, CDN, etc.) y obtén su URL pública final.
2. En `public/img/propiedades/<slug>/`, crea un archivo de texto llamado
   `<siguiente-número>.<extensión-real>.url` (ej. `4.mp4.url` si ya existen `1`, `2` y `3`).
3. Escribe la URL completa como único contenido de ese archivo (sin comillas, sin JSON, una
   sola línea).
4. Corre el build (`node generator/build.js`). No hace falta tocar ningún JSON ni código.
