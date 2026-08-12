/**
 * Deja la base en el estado recién sembrado: borra todo lo transaccional
 * (publicaciones, ofertas, trabajos, créditos, coincidencias) y conserva el
 * catálogo, los paquetes y las cuentas.
 *
 * Sirve para volver a correr `scripts/probar-flujo.mjs` desde cero: sin esto,
 * los desbloqueos de una pasada anterior siguen ahí y la siguiente pasada mide
 * un estado que no es el inicial.
 *
 *   npx tsx scripts/reiniciar.ts && npm run db:seed
 *
 * ⚠️ **BORRA LAS PUBLICACIONES DE TODAS LAS CUENTAS, no solo las de prueba.**
 * Eso ya costó caro: alguien publicó un servicio con su cuenta de pruebas
 * manuales, se corrió `npm run probar` para validar otra cosa y el servicio
 * desapareció. Desde fuera parecía que la aplicación borraba datos al iniciar
 * sesión.
 *
 * Por eso ahora se PLANTA si encuentra publicaciones de cuentas creadas a mano,
 * y hay que confirmarlo a propósito:
 *
 *   CONFIRMAR=si npm run probar
 */
import 'dotenv/config'
import { copyFile, mkdir, readdir, unlink } from 'node:fs/promises'
import { PrismaClient } from '../app/generated/prisma'

const prisma = new PrismaClient()

const BASE = 'prisma/dev.db'
const COPIAS = 'prisma/copias'
const CUANTAS_GUARDAR = 10

/**
 * Copia la base ANTES de tocarla.
 *
 * La barrera de más abajo avisa, pero se puede saltar con `CONFIRMAR=si` — y se
 * saltó, dos veces, y las dos se perdieron datos reales que no había forma de
 * recuperar. El aviso servía de poco: lo que faltaba era que el borrado dejara
 * de ser irreversible.
 *
 * Es un archivo SQLite: copiarlo es copiar la base entera. Se guardan las 10
 * últimas y se restauran con `npx tsx scripts/restaurar.ts`.
 */
async function copiaDeSeguridad() {
  await mkdir(COPIAS, { recursive: true })

  const sello = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const destino = `${COPIAS}/dev-${sello}.db`
  await copyFile(BASE, destino)
  console.log(`Copia guardada en ${destino}`)

  // Se conservan solo las últimas: son ~270 KB cada una y no hace falta más.
  const viejas = (await readdir(COPIAS))
    .filter((f) => f.startsWith('dev-') && f.endsWith('.db'))
    .sort()
    .slice(0, -CUANTAS_GUARDAR)
  for (const f of viejas) await unlink(`${COPIAS}/${f}`)
}

// Las cuentas que siembra `prisma/seed.ts` y las que fabrican los guiones de
// prueba. Todo lo que no esté aquí lo creó una persona a mano.
const DEMO = ['admin@conectaia.com', 'maria@conectaia.com', 'carlos@conectaia.com']
// ⚠️ Cada vez que un guion de prueba invente un correo nuevo hay que añadir su
// prefijo aquí. Si no, la barrera lo toma por una cuenta de verdad y se planta
// en cada pasada — y acabas saltándotela siempre, que es como se perdieron los
// datos las dos veces.
const DE_PRUEBA = ['rosa+', 'diana+', 'diego+', 'entrada+', 'prueba+', 'diag+']

const esDeVerdad = (email: string) =>
  !DEMO.includes(email) && !DE_PRUEBA.some((p) => email.startsWith(p))

/**
 * Avisa —y detiene— si el reinicio se va a llevar por delante trabajo real.
 *
 * No comprueba "hay cuentas de verdad" sino "hay cuentas de verdad CON algo
 * publicado": una cuenta vacía no pierde nada y no vale la pena estorbar por
 * ella cada vez que se corren las pruebas.
 */
async function avisarSiHayTrabajoReal() {
  if (process.env.CONFIRMAR === 'si') return

  const usuarios = await prisma.usuario.findMany({
    select: {
      email: true,
      _count: { select: { necesidades: true, servicios: true } },
    },
  })

  const enPeligro = usuarios.filter(
    (u) => esDeVerdad(u.email) && u._count.necesidades + u._count.servicios > 0,
  )

  if (enPeligro.length === 0) return

  console.error('\n⛔ El reinicio se ha detenido: hay publicaciones hechas a mano.\n')
  for (const u of enPeligro) {
    console.error(
      `   ${u.email} — ${u._count.necesidades} necesidad(es), ${u._count.servicios} servicio(s)`,
    )
  }
  console.error(
    '\nBorrarlas dejaría esas cuentas vacías, y desde la aplicación parece que los\n' +
      'datos se pierden solos. Si de verdad quieres borrarlo todo:\n\n' +
      '   CONFIRMAR=si npm run probar\n',
  )
  process.exit(1)
}

async function main() {
  await avisarSiHayTrabajoReal()
  await copiaDeSeguridad()

  console.log('Reiniciando datos transaccionales…')

  // El orden importa: primero lo que apunta a otras tablas.
  await prisma.calificacion.deleteMany()
  await prisma.trabajo.deleteMany()
  await prisma.postulacion.deleteMany()
  await prisma.match.deleteMany()
  await prisma.movimientoCredito.deleteMany()
  await prisma.desbloqueo.deleteMany()
  await prisma.recarga.deleteMany()
  await prisma.notificacion.deleteMany()
  await prisma.alertaModeracion.deleteMany()
  await prisma.foto.deleteMany()
  await prisma.necesidad.deleteMany()
  await prisma.servicio.deleteMany()

  // Los saldos vuelven a cero: los movimientos que los justificaban ya no están.
  await prisma.usuario.updateMany({ data: { creditos: 0 } })

  console.log('Listo. Ahora corre: npm run db:seed')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
