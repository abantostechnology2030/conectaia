import { prisma } from '@/lib/db'
import { conRol } from '@/lib/guard'
import { avisarVarios, TIPOS } from '@/lib/notificaciones'

type Params = { params: Promise<{ id: string }> }

// Transiciones que el DUEÑO de la necesidad puede provocar a mano.
//
// ⚠️ **El dueño no puede llegar a `publicada` por ningún camino.** Publicar es
// pedir revisión (`en_revision`), y a `publicada` solo se llega desde
// `/api/admin/aprobaciones`. Si aquí se dejara `borrador -> publicada`, la
// moderación previa se saltaría con una llamada a mano desde la consola.
//
// El paso a `oferta_seleccionada` tampoco está: lo hace /aceptar, porque
// además cobra el crédito y cierra las demás ofertas.
const PERMITIDAS: Record<string, string[]> = {
  borrador: ['en_revision', 'cancelada'],
  en_revision: ['borrador', 'cancelada'],
  rechazada: ['en_revision', 'borrador', 'cancelada'],
  publicada: ['borrador', 'cancelada'],
  oferta_seleccionada: ['en_proceso', 'cancelada'],
  en_proceso: ['cancelada'],
  finalizada: [],
  cancelada: ['en_revision'],
}

export const PATCH = conRol(['usuario'], async (ctx, req, { params }: Params) => {
  const id = Number((await params).id)
  const { estado } = await req.json().catch(() => ({ estado: '' }))

  const n = await prisma.necesidad.findUnique({ where: { id } })
  if (!n || n.usuarioId !== ctx.id) return Response.json({ error: 'No encontrada' }, { status: 404 })

  const posibles = PERMITIDAS[n.estado] ?? []
  if (!posibles.includes(estado)) {
    return Response.json(
      { error: `No se puede pasar de "${n.estado}" a "${estado}"` },
      { status: 409 },
    )
  }

  await prisma.necesidad.update({
    where: { id },
    data: {
      estado,
      // Al volver a pedir revisión se limpia el motivo del rechazo anterior:
      // dejarlo haría que el aviso siguiera diciendo por qué se le negó algo
      // que ya corrigió.
      ...(estado === 'en_revision' ? { motivoRechazo: null } : {}),
    },
  })

  // Ya no se recalcula el matching aquí: por esta ruta no se llega a
  // `publicada`. Lo hace la aprobación del administrador.

  // Al cancelar hay que avisar a quienes habían ofertado: se quedaron
  // esperando una respuesta que ya no va a llegar.
  if (estado === 'cancelada') {
    const pendientes = await prisma.postulacion.findMany({
      where: { necesidadId: id, estado: 'enviada' },
      select: { usuarioId: true },
    })
    await prisma.postulacion.updateMany({
      where: { necesidadId: id, estado: 'enviada' },
      data: { estado: 'no_seleccionada' },
    })
    await avisarVarios(
      pendientes.map((p) => ({
        usuarioId: p.usuarioId,
        tipo: TIPOS.OFERTA_NO_SELECCIONADA,
        titulo: 'Una necesidad fue cancelada',
        mensaje: `"${n.titulo}" fue cancelada por quien la publicó. Tu oferta ya no está en juego.`,
        url: '/postulaciones',
      })),
    )
  }

  return Response.json({ ok: true, estado })
})
