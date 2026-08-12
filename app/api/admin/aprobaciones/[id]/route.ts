import { prisma } from '@/lib/db'
import { conRol } from '@/lib/guard'
import { recalcularParaNecesidad, recalcularParaServicio } from '@/lib/matching'
import { avisar, TIPOS } from '@/lib/notificaciones'

type Params = { params: Promise<{ id: string }> }

/**
 * Solo se resuelve lo que está esperando.
 *
 * Sin esto, dos administradores mirando la misma cola resolverían dos veces lo
 * mismo y el segundo pisaría al primero — incluyendo volver a publicar algo que
 * el otro acababa de rechazar.
 */
function yaResuelta(estado: string): Response | null {
  if (estado === 'en_revision') return null
  return Response.json(
    { error: 'Esa publicación ya no está esperando revisión', estado },
    { status: 409 },
  )
}

/**
 * APROBAR O RECHAZAR UNA PUBLICACIÓN.
 *
 * Es el ÚNICO camino a `publicada` / `publicado`. Ni el formulario ni la ruta
 * de estados del dueño pueden llegar ahí: publicar es pedir revisión, y quien
 * la concede es el administrador.
 *
 * El `id` es el de la publicación y `tipo` dice de cuál de las dos tablas. Van
 * juntas en una sola ruta porque la decisión es la misma —aprobar o no— y
 * separarlas duplicaría el aviso, el matching y la comprobación de estado.
 */
export const PATCH = conRol(['admin'], async (ctx, req, { params }: Params) => {
  const id = Number((await params).id)
  const b = await req.json().catch(() => ({}))

  const tipo = b.tipo === 'servicio' ? 'servicio' : b.tipo === 'necesidad' ? 'necesidad' : null
  if (!tipo) return Response.json({ error: 'Falta el tipo de publicación' }, { status: 400 })

  const aprobar = b.accion === 'aprobar'
  if (!aprobar && b.accion !== 'rechazar') {
    return Response.json({ error: 'La acción es aprobar o rechazar' }, { status: 400 })
  }

  // Un rechazo sin explicación deja al usuario sin saber qué corregir, y lo
  // único que puede hacer es volver a enviar lo mismo. Se exige motivo por la
  // misma razón que en los ajustes de créditos.
  const motivo = String(b.motivo ?? '').trim()
  if (!aprobar && motivo.length < 5) {
    return Response.json(
      { error: 'Escribe por qué no se aprueba (mínimo 5 caracteres)' },
      { status: 400 },
    )
  }

  const esNecesidad = tipo === 'necesidad'

  // Se resuelve cada tabla en su propia rama. Unificarlas obligaba a manosear
  // un tipo unión (`publicadaAt` / `publicadoAt`) con conversiones a mano, que
  // es justo donde se cuela un campo mal escrito sin que nadie lo note.
  let titulo: string
  let usuarioId: number

  if (esNecesidad) {
    const n = await prisma.necesidad.findUnique({
      where: { id },
      select: { titulo: true, estado: true, usuarioId: true, publicadaAt: true },
    })
    if (!n) return Response.json({ error: 'Esa publicación no existe' }, { status: 404 })
    const veto = yaResuelta(n.estado)
    if (veto) return veto

    titulo = n.titulo
    usuarioId = n.usuarioId

    await prisma.necesidad.update({
      where: { id },
      data: {
        estado: aprobar ? 'publicada' : 'rechazada',
        motivoRechazo: aprobar ? null : motivo,
        revisadaAt: new Date(),
        // La antigüedad del aviso empieza al aprobarse, no al enviarse: es
        // cuando existió de verdad para los demás. Y se fija una sola vez.
        publicadaAt: aprobar && !n.publicadaAt ? new Date() : n.publicadaAt,
      },
    })

    // El matching solo cruza lo publicado, así que se lanza AHORA: al crear la
    // publicación no se hizo nada porque todavía no existía para nadie.
    if (aprobar) await recalcularParaNecesidad(id)
  } else {
    const s = await prisma.servicio.findUnique({
      where: { id },
      select: { nombre: true, estado: true, usuarioId: true, publicadoAt: true },
    })
    if (!s) return Response.json({ error: 'Esa publicación no existe' }, { status: 404 })
    const veto = yaResuelta(s.estado)
    if (veto) return veto

    titulo = s.nombre
    usuarioId = s.usuarioId

    await prisma.servicio.update({
      where: { id },
      data: {
        estado: aprobar ? 'publicado' : 'rechazado',
        motivoRechazo: aprobar ? null : motivo,
        revisadaAt: new Date(),
        publicadoAt: aprobar && !s.publicadoAt ? new Date() : s.publicadoAt,
      },
    })

    if (aprobar) await recalcularParaServicio(id)
  }

  const pub = { usuarioId }

  await avisar(
    aprobar
      ? {
          usuarioId: pub.usuarioId,
          tipo: TIPOS.PUBLICACION_APROBADA,
          titulo: '✅ Tu publicación ya está visible',
          mensaje: `"${titulo}" fue aprobada y ya la pueden ver los demás.`,
          url: esNecesidad ? `/necesidades/${id}` : `/servicios/${id}`,
        }
      : {
          usuarioId: pub.usuarioId,
          tipo: TIPOS.PUBLICACION_RECHAZADA,
          titulo: '⚠️ Tu publicación no fue aprobada',
          mensaje: `"${titulo}": ${motivo}. Puedes corregirla y volver a enviarla.`,
          url: esNecesidad ? `/necesidades/${id}` : `/servicios/${id}`,
        },
  )

  // El rastro de la revisión son `revisadaAt`, `motivoRechazo` y el aviso que
  // acaba de recibir el usuario. NO se escribe en `AlertaModeracion`: esa tabla
  // es de detecciones de antievasión y reportes, y mezclar ahí las decisiones
  // de la cola desvirtuaría el contador de /admin/moderacion.
  const nuevo = aprobar
    ? esNecesidad
      ? 'publicada'
      : 'publicado'
    : esNecesidad
      ? 'rechazada'
      : 'rechazado'

  return Response.json({ ok: true, estado: nuevo })
})
