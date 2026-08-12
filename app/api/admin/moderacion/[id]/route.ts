import { prisma } from '@/lib/db'
import { conRol } from '@/lib/guard'

type Params = { params: Promise<{ id: string }> }

// Marcar una alerta de moderación como revisada (PDR §41).
export const PATCH = conRol(['admin'], async (_ctx, req, { params }: Params) => {
  const id = Number((await params).id)
  const b = await req.json().catch(() => ({}))
  const revisada = b.revisada !== false

  await prisma.alertaModeracion.update({ where: { id }, data: { revisada } })
  return Response.json({ ok: true })
})
