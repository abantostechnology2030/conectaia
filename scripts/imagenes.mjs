/**
 * Prepara el logotipo y el favicon a partir de los originales de `archivos/`.
 *
 *   node scripts/imagenes.mjs
 *
 * Herramienta de DESARROLLO: `sharp` es una devDependency y no se usa en
 * tiempo de ejecución. Se corre a mano cuando cambian los originales, y lo que
 * se despliega son los PNG ya generados.
 *
 * Lo que hace, y por qué así:
 *
 * 1. **Quita el fondo blanco con un relleno desde los bordes**, no borrando
 *    todos los píxeles blancos de la imagen. La diferencia importa: dentro del
 *    logotipo el apretón de manos ES blanco, y un borrado global lo dejaría
 *    agujereado. El relleno solo alcanza el blanco conectado con el borde.
 * 2. **Suaviza el halo**: al recortar queda una orla de píxeles casi blancos
 *    del antialias del original. Se les baja la opacidad según lo claros que
 *    sean, para que el logotipo no salga con un contorno sucio sobre fondos de
 *    color.
 * 3. **Recorta el margen sobrante** para que el alto que se pide en el código
 *    sea el alto real del dibujo y no el del espacio en blanco.
 */
import sharp from 'sharp'
import { mkdir } from 'fs/promises'

// A partir de aquí un píxel cuenta como "fondo".
const UMBRAL_FONDO = 238
// Por debajo de aquí un píxel es dibujo de pleno derecho y no se toca.
const UMBRAL_HALO = 205

async function transparentar(entrada) {
  const { data, info } = await sharp(entrada)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width: w, height: h } = info
  const px = (x, y) => (y * w + x) * 4
  const claro = (i, umbral) => data[i] >= umbral && data[i + 1] >= umbral && data[i + 2] >= umbral

  // --- 1. Relleno desde los bordes ----------------------------------------
  const fondo = new Uint8Array(w * h)
  const pila = []

  const encolar = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return
    const n = y * w + x
    if (fondo[n]) return
    if (!claro(px(x, y), UMBRAL_FONDO)) return
    fondo[n] = 1
    pila.push(x, y)
  }

  for (let x = 0; x < w; x++) {
    encolar(x, 0)
    encolar(x, h - 1)
  }
  for (let y = 0; y < h; y++) {
    encolar(0, y)
    encolar(w - 1, y)
  }

  while (pila.length) {
    const y = pila.pop()
    const x = pila.pop()
    encolar(x + 1, y)
    encolar(x - 1, y)
    encolar(x, y + 1)
    encolar(x, y - 1)
  }

  for (let n = 0; n < w * h; n++) if (fondo[n]) data[n * 4 + 3] = 0

  // --- 2. Suavizado del halo ----------------------------------------------
  // Solo se tocan los píxeles que siguen opacos, son muy claros y tienen al
  // menos un vecino ya transparente: son justo la orla del antialias.
  const tocaFondo = (x, y) =>
    (x > 0 && fondo[y * w + x - 1]) ||
    (x < w - 1 && fondo[y * w + x + 1]) ||
    (y > 0 && fondo[(y - 1) * w + x]) ||
    (y < h - 1 && fondo[(y + 1) * w + x])

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = y * w + x
      if (fondo[n]) continue
      const i = px(x, y)
      if (!claro(i, UMBRAL_HALO)) continue
      if (!tocaFondo(x, y)) continue

      const luz = (data[i] + data[i + 1] + data[i + 2]) / 3
      const opacidad = (255 - luz) / (255 - UMBRAL_HALO)
      data[i + 3] = Math.max(0, Math.min(255, Math.round(opacidad * 255)))
    }
  }

  // --- 3. Recorte del margen ----------------------------------------------
  return sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .trim({ threshold: 1 })
    .png()
}

// Los PNG salen con paleta comprimida: el original pesa casi 1 MB y se pinta a
// 160 px de alto. Servir el archivo entero en cada carga de página sería tirar
// un megabyte por algo que se ve del tamaño de un sello.
const comprimir = (s) => s.png({ palette: true, quality: 90, effort: 9 })

async function main() {
  await mkdir('public', { recursive: true })

  const logo = await transparentar('archivos/logotipo.png')

  // Los altos de origen son el DOBLE del mayor tamaño al que se pinta cada
  // versión: en una pantalla de densidad doble, una imagen servida a su tamaño
  // exacto se ve blanda. Si se agranda el logotipo en la interfaz, hay que
  // subir también estos números o se verá borroso.
  //
  //   logotipo.png       se pinta hasta 280 px (portada) y 150 (login) -> 560
  //   logotipo-menu.png  se pinta a 120 px (menú lateral)              -> 320
  //
  // El original de `archivos/` mide 1062x1004, así que hay margen de sobra: no
  // se está agrandando nada, solo se recorta menos.
  const grande = await comprimir(logo.clone().resize({ height: 560 })).toBuffer()
  const infoGrande = await sharp(grande).toFile('public/logotipo.png')
  console.log(`  public/logotipo.png        ${infoGrande.width}x${infoGrande.height}`)

  const chico = await comprimir(logo.clone().resize({ height: 320 })).toBuffer()
  const infoChico = await sharp(chico).toFile('public/logotipo-menu.png')
  console.log(`  public/logotipo-menu.png   ${infoChico.width}x${infoChico.height}`)

  // --- La ilustración de la portada ---------------------------------------
  //
  // Preside el héroe a todo el ancho de la columna (máx. 1152 px), así que se
  // sirve a 1536 —lo que mide el original— y no se agranda.
  //
  // Va en WEBP y no en PNG, y esta vez sí importa: el original pesa 3.1 MB.
  // Con la paleta de 256 colores que usa `comprimir()` bajaría a 711 KB pero
  // con bandas visibles en las pieles y los degradados; en webp son 199 KB y
  // sin tocar la calidad. `sharp` lo hace de serie, no es una dependencia
  // nueva.
  //
  // ⚠️ NO se le quita el fondo. Se probó, y no funciona: el fondo tiene un
  // viñeteado que corta el relleno desde los bordes, así que queda un
  // rectángulo a medias. Subir el umbral se comería el gorro del chef, el
  // overol del pintor y la diadema de la señora, que también son casi
  // blancos. Se deja con su fondo claro y la portada la enmarca.
  const heroInfo = await sharp('archivos/hero.png')
    .resize({ width: 1536, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile('public/hero.webp')
  console.log(
    `  public/hero.webp           ${heroInfo.width}x${heroInfo.height}  ${Math.round(heroInfo.size / 1024)} KB`,
  )

  // Icono de la aplicación. Next lo toma de app/icon.png sin más
  // configuración; el .ico deja de hacer falta.
  const marca = await transparentar('archivos/favicon.png')
  const buf = await marca.clone().toBuffer()
  const { width, height } = await sharp(buf).metadata()
  const lado = Math.max(width, height)

  // Se centra sobre un lienzo cuadrado y transparente: un icono no cuadrado
  // sale deformado en la pestaña del navegador.
  const cuadrado = (tam) =>
    comprimir(
      sharp(buf)
        .resize({
          width: lado,
          height: lado,
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .resize(tam, tam),
    )

  await cuadrado(512).toFile('app/icon.png')
  console.log('  app/icon.png               512x512')

  await cuadrado(180).toFile('app/apple-icon.png')
  console.log('  app/apple-icon.png         180x180')

  // Copia suelta para poder usarla en cualquier sitio de la interfaz.
  await cuadrado(256).toFile('public/marca.png')
  console.log('  public/marca.png           256x256')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
