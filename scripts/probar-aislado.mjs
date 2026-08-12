/**
 * Corre las comprobaciones de flujo SIN TOCAR TU BASE.
 *
 *   npm run probar:aislado
 *
 * `npm run probar` reinicia `prisma/dev.db`, que es la misma base donde estás
 * haciendo tus pruebas a mano. Eso ya borró datos reales tres veces: el aviso
 * se puede saltar con `CONFIRMAR=si`, y quien lo salta es justo el que tiene
 * prisa por verificar algo. La solución no era otro aviso, era que las pruebas
 * dejaran de compartir base.
 *
 * Lo que hace:
 *   1. Prepara `prisma/test.db` desde cero (schema + seed)
 *   2. Compila y levanta un SEGUNDO servidor en el puerto 3099 contra esa base
 *   3. Corre `probar-flujo.mjs` contra él
 *   4. Lo apaga
 *
 * `prisma/dev.db` no se abre en ningún momento.
 *
 * ⚠️ **Se usa `next start`, no `next dev`, y no es un capricho:** Next se niega
 * a levantar un segundo `next dev` en la misma carpeta ("Another next dev
 * server is already running"), así que con el servidor de siempre encendido el
 * aislado no arrancaba. `next start` sí convive, y de paso las pruebas corren
 * contra una compilación de verdad.
 *
 * Con `--sin-build` se salta la compilación, para cuando ya hay una reciente.
 */
import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'

const PUERTO = 3099
const BASE_URL = `http://localhost:${PUERTO}`
const URL_BD = 'file:./test.db'

// El entorno que verán todos los procesos hijos. `DATABASE_URL` es lo único que
// cambia, y es lo que hace que ni Prisma ni Next se acerquen a dev.db.
const entorno = { ...process.env, DATABASE_URL: URL_BD }

const correr = (cmd, args, extra = {}) =>
  new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { env: entorno, stdio: 'inherit', shell: true, ...extra })
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} salió con ${code}`))))
    p.on('error', reject)
  })

async function esperarServidor(intentos = 120) {
  for (let i = 0; i < intentos; i++) {
    try {
      await fetch(BASE_URL, { signal: AbortSignal.timeout(2000) })
      return true
    } catch {
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
  return false
}

let servidor = null

async function main() {
  console.log(`\n🧪 Pruebas aisladas — base ${URL_BD}, puerto ${PUERTO}`)
  console.log('   prisma/dev.db NO se toca.\n')

  // Base de pruebas desde cero en cada pasada: así el resultado no depende de
  // lo que dejó la anterior.
  await rm('prisma/test.db', { force: true })
  await correr('npx', ['prisma', 'db', 'push', '--skip-generate', '--accept-data-loss'])
  await correr('npx', ['tsx', 'prisma/seed.ts'])

  if (!process.argv.includes('--sin-build')) {
    console.log('\n▶ Compilando…')
    await correr('npx', ['next', 'build'])
  }

  console.log(`\n▶ Levantando el servidor de pruebas en ${PUERTO}…`)
  servidor = spawn('npx', ['next', 'start', '-p', String(PUERTO)], {
    env: entorno,
    stdio: 'ignore',
    shell: true,
    detached: false,
  })

  if (!(await esperarServidor())) throw new Error('El servidor de pruebas no llegó a responder')
  console.log('✔ Listo.\n')

  await correr('node', ['scripts/probar-flujo.mjs'], { env: { ...entorno, BASE: BASE_URL } })
}

/**
 * Apaga el servidor de pruebas y ESPERA a que suelte el puerto.
 *
 * ⚠️ Hay que esperar de verdad. Next se niega a arrancar un segundo `next dev`
 * en la misma carpeta, así que si este proceso se va antes de que el de pruebas
 * muera, el `npm run dev` de siempre falla con "Another next dev server is
 * already running" — y el culpable ya no está a la vista. Pasó.
 *
 * Y hay que matar el ÁRBOL: `next dev` deja un hijo que es el que tiene el
 * puerto abierto, así que matar solo al padre no libera nada.
 */
async function apagar() {
  if (servidor && !servidor.killed) {
    await new Promise((resolve) => {
      const t = spawn('taskkill', ['/pid', String(servidor.pid), '/T', '/F'], {
        stdio: 'ignore',
        shell: true,
      })
      t.on('exit', resolve)
      t.on('error', () => {
        servidor.kill('SIGKILL')
        resolve()
      })
    })
  }

  // Se confirma que el puerto quedó libre en vez de suponerlo.
  for (let i = 0; i < 20; i++) {
    try {
      await fetch(BASE_URL, { signal: AbortSignal.timeout(500) })
      await new Promise((r) => setTimeout(r, 500))
    } catch {
      return
    }
  }
  console.warn(`⚠️ El puerto ${PUERTO} sigue ocupado. Ciérralo con: npx kill-port ${PUERTO}`)
}

process.on('SIGINT', async () => {
  await apagar()
  process.exit(130)
})

main()
  .then(async () => {
    await apagar()
    console.log('\n✅ Terminado. Tu base de desarrollo quedó intacta.')
    process.exit(0)
  })
  .catch(async (e) => {
    await apagar()
    console.error(`\n❌ ${e.message}`)
    process.exit(1)
  })
