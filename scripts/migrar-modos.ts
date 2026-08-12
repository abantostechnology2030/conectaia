/**
 * Deja a cada cuenta en uno de los dos lados que existen hoy.
 *
 *   npx tsx scripts/migrar-modos.ts
 *
 * En la base quedan dos herencias que ya no son modos válidos:
 *
 *   · `null`      — cuentas de cuando la pregunta se hacía al entrar, en una
 *                   pantalla que ya no existe.
 *   · `'ambos'`   — cuentas de cuando se podían tener los dos lados a la vez.
 *
 * Se resuelven MIRANDO LO QUE LA PERSONA YA HIZO, no poniendo el mismo valor a
 * todas: quien tiene servicios publicados y ninguna necesidad claramente venía a
 * ofrecer, y abrirle el panel de "necesito" le escondería justo su trabajo. En
 * caso de duda, `busco`: es el lado con el que llega la mayoría y el único que no
 * presupone que el usuario tenga algo que ofrecer.
 *
 * No es una decisión que atrape a nadie — los dos botones del panel están
 * siempre a la vista. Es idempotente: pasarlo dos veces no cambia nada.
 */
import { prisma } from '../lib/db'

async function main() {
  const sueltas = await prisma.usuario.findMany({
    where: {
      rol: 'usuario',
      OR: [{ modo: null }, { modo: { notIn: ['busco', 'ofrezco'] } }],
    },
    select: {
      id: true,
      email: true,
      modo: true,
      _count: { select: { necesidades: true, servicios: true } },
    },
  })

  if (sueltas.length === 0) {
    console.log('✅ Todas las cuentas están en un lado válido. Nada que migrar.')
    return
  }

  let aOfrezco = 0
  for (const u of sueltas) {
    // Solo se manda a "ofrezco" a quien tiene servicios y ninguna necesidad. Si
    // tiene de las dos cosas, `busco` y que cambie con un clic: es reversible.
    const lado = u._count.servicios > 0 && u._count.necesidades === 0 ? 'ofrezco' : 'busco'
    if (lado === 'ofrezco') aOfrezco++
    await prisma.usuario.update({ where: { id: u.id }, data: { modo: lado } })
  }

  console.log(
    `✅ ${sueltas.length} cuenta(s) migradas: ${aOfrezco} a "ofrezco", ${sueltas.length - aOfrezco} a "busco".`,
  )
}

// El administrador no participa en el marketplace y nunca tuvo modo: se deja
// como está a propósito.
main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
