import { prisma } from '@/lib/db'
import { conRol } from '@/lib/guard'

type Params = { params: Promise<{ id: string }> }

// Retirar una oferta. Solo mientras nadie la haya seleccionado: después ya hay
// un trabajo en marcha y un crédito cobrado de por medio.
export const DELETE = conRol(['usuario'], async (ctx, _req, { params }: Params) => {
  const id = Number((await params).id)
  const p = await prisma.postulacion.findUnique({ where: { id } })

  if (!p || p.usuarioId !== ctx.id) return Response.json({ error: 'No encontrada' }, { status: 404 })
  if (p.estado !== 'enviada') {
    return Response.json({ error: 'Esta oferta ya fue resuelta y no se puede retirar' }, { status: 409 })
  }

  // Se marca como retirada en vez de borrarla: quien publicó la necesidad ya
  // la vio, y hacerla desaparecer sin rastro se lee como un fallo de la app.
  await prisma.postulacion.update({ where: { id }, data: { estado: 'retirada' } })

  return Response.json({ ok: true })
})
