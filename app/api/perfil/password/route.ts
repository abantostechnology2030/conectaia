import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { conSesion } from '@/lib/guard'

export const PATCH = conSesion(async (ctx, req) => {
  const b = await req.json().catch(() => ({}))
  const actual = String(b.actual ?? '')
  const nueva = String(b.nueva ?? '')

  if (nueva.length < 6) {
    return Response.json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' }, { status: 400 })
  }

  const u = await prisma.usuario.findUnique({ where: { id: ctx.id }, select: { password: true } })
  if (!u) return Response.json({ error: 'No encontrado' }, { status: 404 })

  if (!(await bcrypt.compare(actual, u.password))) {
    return Response.json({ error: 'La contraseña actual no es correcta' }, { status: 400 })
  }

  await prisma.usuario.update({
    where: { id: ctx.id },
    data: { password: await bcrypt.hash(nueva, 10) },
  })

  return Response.json({ ok: true })
})
