import { prisma } from '@/lib/db'
import { conRol } from '@/lib/guard'
import { vetoPorModo } from '@/lib/modos'
import { revisarTextos, respuestaSiBloqueado } from '@/lib/moderacion'
import { avisar, TIPOS } from '@/lib/notificaciones'
import { aceptaPostulaciones } from '@/lib/estados'
import { numeroOpcional, texto, textoOpcional, fechaOpcional } from '@/lib/publicaciones'

// Postularse a una necesidad (PDR §10-11).
//
// Las cuatro reglas del §11 se comprueban aquí; la de "no dos veces" la
// sostiene además el @@unique(necesidadId, usuarioId) del schema, porque dos
// pestañas abiertas pueden pasar la comprobación a la vez.
export const POST = conRol(['usuario'], async (ctx, req) => {
  // Sin este lado activado no se publica, aunque se llame a la API a mano.
  const veto = await vetoPorModo(ctx.id, 'ofrezco')
  if (veto) return veto

  const b = await req.json().catch(() => ({}))

  const necesidadId = Number(b.necesidadId)
  const precio = numeroOpcional(String(b.precio ?? ''))
  const comentario = texto(String(b.comentario ?? ''))
  const servicioId = b.servicioId ? Number(b.servicioId) : null

  if (!precio || precio <= 0) {
    return Response.json({ error: 'Escribe el precio que ofreces' }, { status: 400 })
  }
  if (comentario.length < 10) {
    return Response.json({ error: 'Escribe un comentario para quien publicó la necesidad' }, { status: 400 })
  }

  const necesidad = await prisma.necesidad.findUnique({
    where: { id: necesidadId },
    include: { usuario: { select: { id: true, nombres: true } } },
  })
  if (!necesidad) return Response.json({ error: 'Esa necesidad no existe' }, { status: 404 })

  // No puedes postularte a tu propia necesidad.
  if (necesidad.usuarioId === ctx.id) {
    return Response.json({ error: 'No puedes postularte a tu propia necesidad' }, { status: 403 })
  }
  // Solo mientras esté publicada.
  if (!aceptaPostulaciones(necesidad.estado)) {
    return Response.json({ error: 'Esta necesidad ya no recibe ofertas' }, { status: 409 })
  }

  // El servicio con el que se postula, si lo indicó, tiene que ser suyo.
  if (servicioId) {
    const s = await prisma.servicio.findUnique({ where: { id: servicioId }, select: { usuarioId: true } })
    if (!s || s.usuarioId !== ctx.id) {
      return Response.json({ error: 'Ese servicio no es tuyo' }, { status: 403 })
    }
  }

  const yaHay = await prisma.postulacion.findUnique({
    where: { necesidadId_usuarioId: { necesidadId, usuarioId: ctx.id } },
    select: { id: true },
  })
  if (yaHay) {
    return Response.json({ error: 'Ya te postulaste a esta necesidad' }, { status: 409 })
  }

  try {
    await revisarTextos(ctx.id, 'postulacion', [comentario, String(b.tiempoEstimado ?? ''), String(b.disponibilidad ?? '')])
  } catch (e) {
    const r = respuestaSiBloqueado(e)
    if (r) return r
    throw e
  }

  const postulacion = await prisma.postulacion.create({
    data: {
      necesidadId,
      usuarioId: ctx.id,
      servicioId,
      precio,
      comentario,
      tiempoEstimado: textoOpcional(String(b.tiempoEstimado ?? '')),
      disponibilidad: textoOpcional(String(b.disponibilidad ?? '')),
      fechaPropuesta: fechaOpcional(String(b.fechaPropuesta ?? '')),
    },
  })

  // Si la postulación nace de una coincidencia detectada, queda anotado: es
  // la métrica "coincidencias que generaron postulaciones" del PDR §40.
  if (servicioId) {
    await prisma.match.updateMany({
      where: { necesidadId, servicioId, postuloAt: null },
      data: { postuloAt: new Date() },
    })
  }

  await avisar({
    usuarioId: necesidad.usuarioId,
    tipo: TIPOS.NUEVA_OFERTA,
    titulo: '📨 Recibiste una nueva oferta',
    mensaje: `Alguien ofreció S/ ${precio.toFixed(2)} para "${necesidad.titulo}".`,
    url: `/necesidades/${necesidadId}`,
  })

  return Response.json({ ok: true, id: postulacion.id })
})
