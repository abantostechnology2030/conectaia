import { prisma } from '@/lib/db'
import { conRol } from '@/lib/guard'
import { mover } from '@/lib/creditos'
import { avisar, TIPOS } from '@/lib/notificaciones'

type Params = { params: Promise<{ id: string }> }

// El administrador aprueba o rechaza una recarga (PDR §29).
// Aprobar es lo único que acredita créditos por compra.
export const PATCH = conRol(['admin'], async (ctx, req, { params }: Params) => {
  const id = Number((await params).id)
  const b = await req.json().catch(() => ({}))
  const estado = String(b.estado ?? '')
  const notaAdmin = String(b.notaAdmin ?? '').trim() || null

  if (estado !== 'aprobada' && estado !== 'rechazada') {
    return Response.json({ error: 'Estado no válido' }, { status: 400 })
  }

  const recarga = await prisma.recarga.findUnique({ where: { id } })
  if (!recarga) return Response.json({ error: 'No encontrada' }, { status: 404 })
  if (recarga.estado !== 'pendiente') {
    return Response.json({ error: 'Esta recarga ya fue resuelta' }, { status: 409 })
  }

  await prisma.$transaction(async (tx) => {
    await tx.recarga.update({
      where: { id },
      data: { estado, notaAdmin, resueltoAt: new Date() },
    })

    if (estado === 'aprobada') {
      await mover(tx, {
        usuarioId: recarga.usuarioId,
        tipo: 'recarga',
        cantidad: recarga.creditos,
        motivo: `Recarga aprobada — S/ ${recarga.monto.toFixed(2)}`,
        refTipo: 'recarga',
        refId: recarga.id,
        adminId: ctx.id,
      })
    }
  })

  await avisar({
    usuarioId: recarga.usuarioId,
    tipo: estado === 'aprobada' ? TIPOS.RECARGA_APROBADA : TIPOS.RECARGA_RECHAZADA,
    titulo: estado === 'aprobada' ? '💳 Recarga aprobada' : '⚠️ Recarga rechazada',
    mensaje:
      estado === 'aprobada'
        ? `Se acreditaron ${recarga.creditos} créditos a tu cuenta.`
        : `Tu recarga fue rechazada.${notaAdmin ? ` Motivo: ${notaAdmin}` : ''}`,
    url: '/creditos',
  })

  return Response.json({ ok: true })
})
