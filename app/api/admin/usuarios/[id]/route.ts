import { prisma } from '@/lib/db'
import { conRol } from '@/lib/guard'
import { avisar, TIPOS } from '@/lib/notificaciones'

type Params = { params: Promise<{ id: string }> }

// Suspender / reactivar una cuenta (PDR §39, §41).
export const PATCH = conRol(['admin'], async (ctx, req, { params }: Params) => {
  const id = Number((await params).id)
  const { estado } = await req.json().catch(() => ({ estado: '' }))

  if (estado !== 'activo' && estado !== 'suspendido') {
    return Response.json({ error: 'Estado no válido' }, { status: 400 })
  }

  const u = await prisma.usuario.findUnique({ where: { id } })
  if (!u) return Response.json({ error: 'No encontrado' }, { status: 404 })

  // Un admin no puede suspenderse a sí mismo ni a otro admin: sería la forma
  // más fácil de dejar la plataforma sin nadie que la administre.
  if (u.rol === 'admin') {
    return Response.json({ error: 'No se puede suspender a un administrador' }, { status: 403 })
  }

  await prisma.usuario.update({ where: { id }, data: { estado } })

  if (estado === 'suspendido') {
    // Al suspender se retiran sus publicaciones de la circulación: si no,
    // seguirían apareciendo en el buscador y en las oportunidades de otros.
    await prisma.$transaction([
      prisma.necesidad.updateMany({
        where: { usuarioId: id, estado: 'publicada' },
        data: { estado: 'cancelada' },
      }),
      prisma.servicio.updateMany({
        where: { usuarioId: id, estado: 'publicado' },
        data: { estado: 'desactivado' },
      }),
      prisma.match.deleteMany({
        where: {
          OR: [{ necesidad: { usuarioId: id } }, { servicio: { usuarioId: id } }],
          contactoAt: null,
        },
      }),
    ])

    await avisar({
      usuarioId: id,
      tipo: TIPOS.CUENTA_SUSPENDIDA,
      titulo: '🚫 Tu cuenta fue suspendida',
      mensaje: 'Comunícate con el administrador si crees que se trata de un error.',
    })
  }

  return Response.json({ ok: true, estado })
})
