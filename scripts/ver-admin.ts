/**
 * Muestra las cuentas de administrador que hay en la base y comprueba que la
 * contraseña por defecto sigue siendo válida.
 *
 *   npx tsx scripts/ver-admin.ts
 */
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '../app/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  const admins = await prisma.usuario.findMany({ where: { rol: 'admin' } })

  if (admins.length === 0) {
    console.log('No hay ningún administrador. Corre: npm run db:seed')
    return
  }

  for (const a of admins) {
    const claveDemo = await bcrypt.compare('admin123', a.password)
    console.log(`  correo:     ${a.email}`)
    console.log(`  nombre:     ${a.nombres} ${a.apellidos}`)
    console.log(`  estado:     ${a.estado}`)
    console.log(`  contraseña: ${claveDemo ? 'admin123 (la del seed, sigue funcionando)' : 'cambiada — no es la del seed'}`)
    console.log('')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
