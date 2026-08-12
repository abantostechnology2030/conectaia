// Comprobación del motor de matching contra el ejemplo del PDR §45.
// Se ejecuta con: npx tsx scripts/probar-match.ts
import 'dotenv/config'
import { PrismaClient } from '../app/generated/prisma'
import { puntuar } from '../lib/matching'

const prisma = new PrismaClient()

async function main() {
  const n = await prisma.necesidad.findFirst({ where: { titulo: 'Pintar habitación' } })
  const s = await prisma.servicio.findFirst({ where: { nombre: 'Pintura de interiores' } })
  if (!n || !s) throw new Error('Faltan los datos de ejemplo; corre primero npm run db:seed')

  const d = puntuar(
    { ...n, precioOfrecido: n.precioOfrecido },
    { ...s, precioDesde: s.precioDesde, reputacion: 0 },
  )
  console.log(`PUNTAJE: ${d.puntaje}%`)
  for (const f of d.factores) {
    console.log(
      `  ${f.nombre.padEnd(14)} ${f.puntos.toFixed(1).padStart(5)} / ${String(f.maximo).padStart(2)}   ${f.nota}`,
    )
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
