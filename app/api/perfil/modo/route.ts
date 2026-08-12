import { prisma } from '@/lib/db'
import { conRol } from '@/lib/guard'
import { esModo } from '@/lib/modos'

// Elegir o cambiar el lado del marketplace que se tiene activado.
//
// Cambiar de modo NO borra nada: las necesidades y los servicios que ya existan
// siguen ahí, solo dejan de mostrarse en el menú. Si el usuario reactiva ese
// lado, se los encuentra tal como los dejó. Apagar un lado tampoco despublica:
// eso lo decide él desde cada publicación.
export const PATCH = conRol(['usuario'], async (ctx, req) => {
  const b = await req.json().catch(() => ({}))
  const modo = b.modo

  if (!esModo(modo)) {
    return Response.json({ error: 'Elige una de las opciones' }, { status: 400 })
  }

  await prisma.usuario.update({ where: { id: ctx.id }, data: { modo } })

  return Response.json({ ok: true, modo })
})
