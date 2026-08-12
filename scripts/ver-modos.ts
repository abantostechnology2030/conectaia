/**
 * Muestra qué lado tiene activado cada cuenta.
 *
 *   npx tsx scripts/ver-modos.ts
 */
import 'dotenv/config'
import { PrismaClient } from '../app/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  const usuarios = await prisma.usuario.findMany({
    where: { rol: 'usuario' },
    select: {
      email: true,
      modo: true,
      _count: { select: { necesidades: true, servicios: true } },
    },
    orderBy: { id: 'asc' },
  })

  console.log('modo         necesidades  servicios  correo')
  for (const u of usuarios) {
    console.log(
      `${(u.modo ?? '(sin elegir)').padEnd(12)} ${String(u._count.necesidades).padStart(11)} ${String(
        u._count.servicios,
      ).padStart(9)}  ${u.email}`,
    )
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
