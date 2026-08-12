import { prisma } from '@/lib/db'
import { conSesion } from '@/lib/guard'

// Marcar notificaciones como leídas. Sin cuerpo marca todas; con `{ id }`
// marca solo esa.
export const PATCH = conSesion(async (ctx, req) => {
  const b = await req.json().catch(() => ({}))
  const id = b.id ? Number(b.id) : null

  if (id) {
    // El `usuarioId` en el where no sobra: sin él, cualquiera podría marcar
    // como leídas las notificaciones de otra persona pasando su id.
    await prisma.notificacion.updateMany({
      where: { id, usuarioId: ctx.id },
      data: { leida: true },
    })
  } else {
    await prisma.notificacion.updateMany({
      where: { usuarioId: ctx.id, leida: false },
      data: { leida: true },
    })
  }

  return Response.json({ ok: true })
})
