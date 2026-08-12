import { prisma } from '@/lib/db'
import { conRol } from '@/lib/guard'

type Params = { params: Promise<{ id: string }> }

// Ocultar o restaurar una calificación (PDR §39, moderación).
// No se borra: ocultarla la saca de la reputación y del perfil público, pero
// deja el rastro de que existió, que es lo que permite auditar un caso.
export const PATCH = conRol(['admin'], async (_ctx, req, { params }: Params) => {
  const id = Number((await params).id)
  const b = await req.json().catch(() => ({}))
  const oculta = b.oculta !== false

  await prisma.calificacion.update({ where: { id }, data: { oculta } })
  return Response.json({ ok: true })
})
