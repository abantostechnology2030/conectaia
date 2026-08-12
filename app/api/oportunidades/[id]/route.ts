import { prisma } from '@/lib/db'
import { conRol } from '@/lib/guard'

type Params = { params: Promise<{ id: string }> }

// Marcar una coincidencia como vista (PDR §40: "coincidencias consultadas").
// Se llama al abrir la oportunidad; no cambia nada de lo que ve el usuario,
// solo alimenta las estadísticas del admin.
export const PATCH = conRol(['usuario'], async (ctx, _req, { params }: Params) => {
  const id = Number((await params).id)

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      necesidad: { select: { usuarioId: true } },
      servicio: { select: { usuarioId: true } },
    },
  })
  if (!match) return Response.json({ error: 'No encontrada' }, { status: 404 })

  // La coincidencia solo la puede consultar cualquiera de las dos partes.
  if (match.necesidad.usuarioId !== ctx.id && match.servicio.usuarioId !== ctx.id) {
    return Response.json({ error: 'No autorizado' }, { status: 403 })
  }

  if (!match.vistoAt) {
    await prisma.match.update({ where: { id }, data: { vistoAt: new Date() } })
  }

  return Response.json({ ok: true })
})
