/**
 * Devuelve la base a como estaba antes del último reinicio.
 *
 *   npx tsx scripts/restaurar.ts          # la copia más reciente
 *   npx tsx scripts/restaurar.ts --lista  # ver qué copias hay
 *
 * `scripts/reiniciar.ts` copia `prisma/dev.db` antes de borrar nada, así que
 * siempre hay a dónde volver. Existe porque el borrado ya se llevó por delante
 * datos reales dos veces y no había forma de recuperarlos.
 *
 * ⚠️ **Para el servidor antes de restaurar.** Next mantiene abierta la conexión
 * con SQLite; sobrescribir el archivo por debajo deja al proceso leyendo una
 * base que ya no existe.
 */
import { copyFile, readdir, stat } from 'node:fs/promises'

const BASE = 'prisma/dev.db'
const COPIAS = 'prisma/copias'

async function main() {
  let archivos: string[]
  try {
    archivos = (await readdir(COPIAS))
      .filter((f) => f.startsWith('dev-') && f.endsWith('.db'))
      .sort()
  } catch {
    console.error(`No existe ${COPIAS}. Todavía no se ha hecho ninguna copia.`)
    process.exit(1)
  }

  if (archivos.length === 0) {
    console.error('No hay ninguna copia guardada.')
    process.exit(1)
  }

  if (process.argv.includes('--lista')) {
    console.log(`Copias disponibles (${archivos.length}), de la más vieja a la más nueva:\n`)
    for (const f of archivos) {
      const s = await stat(`${COPIAS}/${f}`)
      console.log(`   ${f}   ${Math.round(s.size / 1024)} KB`)
    }
    console.log('\nPara restaurar la más reciente: npx tsx scripts/restaurar.ts')
    return
  }

  const ultima = archivos[archivos.length - 1]

  // Antes de pisar la base actual se guarda también: si la restauración era un
  // error, todavía se puede deshacer.
  const sello = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  await copyFile(BASE, `${COPIAS}/antes-de-restaurar-${sello}.db`)

  await copyFile(`${COPIAS}/${ultima}`, BASE)
  console.log(`✅ Restaurada la copia ${ultima}`)
  console.log('   La base de antes quedó guardada por si acaso.')
  console.log('   Reinicia el servidor: npm run dev')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
