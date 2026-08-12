import { prisma } from '@/lib/db'
import { conRol } from '@/lib/guard'
import { revisarTextos, respuestaSiBloqueado } from '@/lib/moderacion'
import { avisar, TIPOS } from '@/lib/notificaciones'

/**
 * Calificar (PDR §26-27).
 *
 * Las cinco condiciones del §27 se reducen a una sola comprobación real:
 * tiene que existir un TRABAJO finalizado en el que quien califica sea una de
 * las dos partes. El trabajo solo nace al aceptar una oferta, así que exigirlo
 * garantiza a la vez que hubo necesidad, oferta, selección y relación entre
 * ambos. Lo demás lo sostiene el @@unique(trabajoId, autorId), que impide
 * calificar dos veces el mismo trabajo.
 */
export const POST = conRol(['usuario'], async (ctx, req) => {
  const b = await req.json().catch(() => ({}))

  const trabajoId = Number(b.trabajoId)
  const estrellas = Number(b.estrellas)
  const comentario = String(b.comentario ?? '').trim()

  if (!Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5) {
    return Response.json({ error: 'Elige de 1 a 5 estrellas' }, { status: 400 })
  }

  const t = await prisma.trabajo.findUnique({
    where: { id: trabajoId },
    include: { necesidad: { select: { titulo: true } } },
  })
  if (!t) return Response.json({ error: 'Ese trabajo no existe' }, { status: 404 })

  const esSolicitante = t.solicitanteId === ctx.id
  const esProveedor = t.proveedorId === ctx.id
  if (!esSolicitante && !esProveedor) {
    return Response.json({ error: 'No participaste en este trabajo' }, { status: 403 })
  }
  // No se califica antes de terminar.
  if (t.estado !== 'finalizado') {
    return Response.json({ error: 'Solo puedes calificar cuando el trabajo esté finalizado' }, { status: 409 })
  }
  // Nadie se autocalifica. No debería poder pasar (solicitante y proveedor son
  // personas distintas por construcción), pero si un día se permitiera algo
  // parecido, esta línea evita que la reputación se pueda inflar sola.
  const destinatarioId = esSolicitante ? t.proveedorId : t.solicitanteId
  if (destinatarioId === ctx.id) {
    return Response.json({ error: 'No puedes calificarte a ti mismo' }, { status: 400 })
  }

  const yaHay = await prisma.calificacion.findUnique({
    where: { trabajoId_autorId: { trabajoId, autorId: ctx.id } },
    select: { id: true },
  })
  if (yaHay) return Response.json({ error: 'Ya calificaste este trabajo' }, { status: 409 })

  if (comentario) {
    try {
      await revisarTextos(ctx.id, 'calificacion', [comentario])
    } catch (e) {
      const r = respuestaSiBloqueado(e)
      if (r) return r
      throw e
    }
  }

  await prisma.calificacion.create({
    data: {
      trabajoId,
      autorId: ctx.id,
      destinatarioId,
      estrellas,
      comentario: comentario || null,
      papel: esSolicitante ? 'solicitante' : 'proveedor',
    },
  })

  await avisar({
    usuarioId: destinatarioId,
    tipo: TIPOS.CALIFICACION_RECIBIDA,
    titulo: '⭐ Recibiste una calificación',
    mensaje: `Te calificaron con ${estrellas} estrella${estrellas === 1 ? '' : 's'} por "${t.necesidad.titulo}".`,
    url: `/trabajos/${trabajoId}`,
  })

  return Response.json({ ok: true })
})
