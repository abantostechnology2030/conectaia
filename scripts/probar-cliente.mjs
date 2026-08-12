/**
 * Comprueba que NINGÚN módulo de servidor acabó en el paquete del navegador.
 *
 *   npm run build && node scripts/probar-cliente.mjs
 *
 * Este es el único fallo de esta aplicación que no avisa por ningún lado:
 * `npm run build` pasa, `eslint` pasa, la página se pinta perfecta y el HTML
 * del servidor contiene todo lo que se espera — pero el componente de cliente
 * nunca llega a hidratarse, porque al evaluar su módulo en el navegador
 * revienta al encontrarse Prisma. El síntoma es un botón que se ve bien y no
 * hace absolutamente nada al pulsarlo.
 *
 * Pasó de verdad: `app/(panel)/panel/SelectorLado.tsx` importaba `MODOS` y
 * `ETIQUETA_MODO` de `lib/modos.ts`, que importa `prisma` y `@/auth`. Los dos
 * botones para cambiar de lado quedaron muertos. Por eso esas constantes viven
 * ahora en `lib/lados.ts`, que no toca el servidor.
 *
 * Si esto falla: busca qué componente con 'use client' importa de un módulo que
 * a su vez importe `prisma`, `@/auth` o `bcryptjs`, y sácale lo que necesite a
 * un archivo sin dependencias de servidor.
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const DIR = '.next/static/chunks'

// Rastros inconfundibles de código que solo puede correr en el servidor.
const PROHIBIDO = [
  ['PrismaClient', 'Prisma'],
  ['@prisma/client', 'Prisma'],
  ['bcryptjs', 'bcrypt'],
]

let fallos = 0
const ok = (cond, texto, extra = '') => {
  console.log(`  ${cond ? '✓' : '✗'} ${texto}${!cond && extra ? ` — ${extra}` : ''}`)
  if (!cond) fallos++
}

async function archivos(dir) {
  const salida = []
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) salida.push(...(await archivos(p)))
    else if (e.name.endsWith('.js')) salida.push(p)
  }
  return salida
}

console.log('\nPaquete del navegador\n')

let js
try {
  js = await archivos(DIR)
} catch {
  console.log(`❌ No existe ${DIR}. Corre antes: npm run build`)
  process.exit(1)
}

ok(js.length > 0, `Se encontraron ${js.length} chunks de cliente`)

for (const [marca, nombre] of PROHIBIDO) {
  const culpables = []
  for (const f of js) {
    if ((await readFile(f, 'utf8')).includes(marca)) culpables.push(f)
  }
  ok(
    culpables.length === 0,
    `${nombre} NO viaja al navegador`,
    `aparece en ${culpables.length} chunk(s): ${culpables.slice(0, 3).join(', ')}`,
  )
}

console.log(
  fallos === 0
    ? '\n✅ El paquete del navegador está limpio de código de servidor.'
    : `\n❌ ${fallos} fallo(s). Los componentes de cliente afectados NO se hidratan: se ven bien y no responden.`,
)
process.exit(fallos === 0 ? 0 : 1)
