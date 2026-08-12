import { prisma } from '@/lib/db'
import { conRol } from '@/lib/guard'
import { recalcularParaServicio } from '@/lib/matching'

type Params = { params: Promise<{ id: string }> }

// Estados de un servicio (PDR §9). "Pausado" es la pieza importante: permite
// dejar de recibir oportunidades sin perder la publicación ni su historial.
//
// ⚠️ **El dueño no llega a `publicado` desde `borrador` ni desde `rechazado`.**
// Publicar es pedir revisión; a `publicado` solo se llega por la aprobación del
// administrador. Sin esto, bastaría una llamada a mano para saltarse la
// moderación previa.
//
// Reactivar sí publica directo, y es correcto: `pausado` y `desactivado` son
// contenido que YA se aprobó y que no ha cambiado desde entonces. Lo que
// dispara una nueva revisión es tocar el contenido, no encender y apagar.
const PERMITIDAS: Record<string, string[]> = {
  borrador: ['en_revision', 'desactivado'],
  en_revision: ['borrador', 'desactivado'],
  rechazado: ['en_revision', 'borrador', 'desactivado'],
  publicado: ['pausado', 'desactivado', 'borrador'],
  pausado: ['publicado', 'desactivado'],
  desactivado: ['publicado'],
}

export const PATCH = conRol(['usuario'], async (ctx, req, { params }: Params) => {
  const id = Number((await params).id)
  const { estado } = await req.json().catch(() => ({ estado: '' }))

  const s = await prisma.servicio.findUnique({ where: { id } })
  if (!s || s.usuarioId !== ctx.id) return Response.json({ error: 'No encontrado' }, { status: 404 })

  const posibles = PERMITIDAS[s.estado] ?? []
  if (!posibles.includes(estado)) {
    return Response.json({ error: `No se puede pasar de "${s.estado}" a "${estado}"` }, { status: 409 })
  }

  await prisma.servicio.update({
    where: { id },
    data: {
      estado,
      publicadoAt: estado === 'publicado' && !s.publicadoAt ? new Date() : s.publicadoAt,
      // Volver a pedir revisión limpia el motivo del rechazo anterior.
      ...(estado === 'en_revision' ? { motivoRechazo: null } : {}),
    },
  })

  if (estado === 'publicado') {
    await recalcularParaServicio(id)
  } else {
    // Al pausar o desactivar se retiran las coincidencias: quien pausa no
    // quiere que le sigan llegando oportunidades, y a la otra parte no debe
    // aparecerle un servicio que ya no atiende.
    await prisma.match.deleteMany({ where: { servicioId: id, contactoAt: null, postuloAt: null } })
  }

  return Response.json({ ok: true, estado })
})
