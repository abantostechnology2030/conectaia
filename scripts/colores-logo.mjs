/**
 * Saca los colores dominantes del logotipo, para que la paleta de la app y el
 * pie de página usen exactamente los mismos y no un azul "parecido".
 *
 *   node scripts/colores-logo.mjs
 */
import sharp from 'sharp'

const { data, info } = await sharp('archivos/logotipo.png')
  .raw()
  .toBuffer({ resolveWithObject: true })

const cuenta = new Map()
const canales = info.channels

for (let i = 0; i < data.length; i += canales) {
  const r = data[i]
  const g = data[i + 1]
  const b = data[i + 2]

  // Fuera el fondo blanco y los grises: buscamos color con saturación.
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max - min < 40) continue
  if (max > 245 && min > 200) continue

  // Se agrupan en cubos de 16 para que los degradados no salgan como mil
  // colores distintos de un solo píxel cada uno.
  const clave = `${r >> 4},${g >> 4},${b >> 4}`
  const previo = cuenta.get(clave) ?? { n: 0, r: 0, g: 0, b: 0 }
  cuenta.set(clave, { n: previo.n + 1, r: previo.r + r, g: previo.g + g, b: previo.b + b })
}

const hex = (n) => n.toString(16).padStart(2, '0')

const top = [...cuenta.values()]
  .sort((a, b) => b.n - a.n)
  .slice(0, 12)
  .map((c) => {
    const r = Math.round(c.r / c.n)
    const g = Math.round(c.g / c.n)
    const b = Math.round(c.b / c.n)
    return { hex: `#${hex(r)}${hex(g)}${hex(b)}`, rgb: `${r},${g},${b}`, pixeles: c.n }
  })

console.log(`Imagen: ${info.width}x${info.height}, ${canales} canales\n`)
console.log('Colores dominantes:')
for (const c of top) console.log(`  ${c.hex}   rgb(${c.rgb})   ${c.pixeles} px`)
