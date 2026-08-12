import { prisma } from '@/lib/db'
import { conRol } from '@/lib/guard'
import { avisar, TIPOS } from '@/lib/notificaciones'

type Params = { params: Promise<{ id: string }> }

// Avanzar el estado de un trabajo. Cualquiera de las dos partes puede marcarlo
// como iniciado o finalizado: la plataforma facilita la conexión, no controla
// la ejecución (PDR §49.10).
export const PATCH = conRol(['usuario'], async (ctx, req, { params }: Params) => {
  const id = Number((await params).id)
  const { estado } = await req.json().catch(() => ({ estado: '' }))

  const t = await prisma.trabajo.findUnique({
    where: { id },
    include: { necesidad: { select: { id: true, titulo: true } } },
  })
  if (!t) return Response.json({ error: 'No encontrado' }, { status: 404 })

  const esParte = t.solicitanteId === ctx.id || t.proveedorId === ctx.id
  if (!esParte) return Response.json({ error: 'No autorizado' }, { status: 403 })

  if (t.estado !== 'en_proceso') {
    return Response.json({ error: 'Este trabajo ya está cerrado' }, { status: 409 })
  }
  if (estado !== 'finalizado' && estado !== 'cancelado') {
    return Response.json({ error: 'Estado no válido' }, { status: 400 })
  }

  const otra = t.solicitanteId === ctx.id ? t.proveedorId : t.solicitanteId

  await prisma.$transaction(async (tx) => {
    await tx.trabajo.update({
      where: { id },
      data: { estado, finalizadoAt: estado === 'finalizado' ? new Date() : null },
    })
    await tx.necesidad.update({
      where: { id: t.necesidadId },
      data: { estado: estado === 'finalizado' ? 'finalizada' : 'cancelada' },
    })
  })

  if (estado === 'finalizado') {
    // Se avisa a las DOS partes: la calificación es bidireccional y ambas
    // tienen algo que hacer ahora (PDR §26).
    await avisar({
      usuarioId: otra,
      tipo: TIPOS.TRABAJO_FINALIZADO,
      titulo: '✅ Trabajo finalizado',
      mensaje: `"${t.necesidad.titulo}" se marcó como finalizado. Ya puedes calificar a la otra persona.`,
      url: `/trabajos/${id}`,
    })
    await avisar({
      usuarioId: ctx.id,
      tipo: TIPOS.CALIFICACION_PENDIENTE,
      titulo: '⭐ Te falta calificar',
      mensaje: `Cuenta cómo fue "${t.necesidad.titulo}". Tu calificación ayuda a los demás a decidir.`,
      url: `/trabajos/${id}`,
    })
  } else {
    await avisar({
      usuarioId: otra,
      tipo: TIPOS.TRABAJO_FINALIZADO,
      titulo: 'Trabajo cancelado',
      mensaje: `"${t.necesidad.titulo}" fue marcado como cancelado.`,
      url: `/trabajos/${id}`,
    })
  }

  return Response.json({ ok: true, estado })
})
