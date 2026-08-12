/**
 * Comprueba caso por caso la validación del destino de vuelta tras el login.
 *
 *   npx tsx scripts/probar-destino.ts
 *
 * Es la pieza que impide que `/login?destino=…` se convierta en un trampolín:
 * un enlace preparado podría llevarse a alguien a otra página justo después de
 * escribir su contraseña, y ahí es donde más se confía en lo que se ve.
 */
import { destinoSeguro } from '../lib/destino'

const CASOS: [string | null | undefined, string, string][] = [
  ['/necesidades/nueva', '/necesidades/nueva', 'una ruta interna se respeta'],
  ['/servicios/nuevo', '/servicios/nuevo', 'la otra puerta también'],
  [undefined, '/panel', 'sin destino, al panel'],
  [null, '/panel', 'nulo, al panel'],
  ['', '/panel', 'vacío, al panel'],
  ['https://otro-sitio.com', '/panel', 'una URL absoluta se descarta'],
  ['http://otro-sitio.com', '/panel', 'sin https tampoco'],
  ['//otro-sitio.com', '/panel', 'el truco de la doble barra se descarta'],
  ['/\\otro-sitio.com', '/panel', 'la barra invertida también'],
  ['javascript:alert(1)', '/panel', 'un esquema javascript: se descarta'],
  ['panel', '/panel', 'sin barra inicial no es una ruta'],
]

let fallos = 0
for (const [entrada, esperado, texto] of CASOS) {
  const salida = destinoSeguro(entrada)
  const bien = salida === esperado
  console.log(`  ${bien ? '✓' : '✗'} ${texto}${bien ? '' : ` — dio "${salida}"`}`)
  if (!bien) fallos++
}

console.log(fallos === 0 ? '\n✅ La validación del destino es correcta.' : `\n❌ ${fallos} fallo(s).`)
process.exit(fallos === 0 ? 0 : 1)
