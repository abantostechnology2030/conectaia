import { prisma } from '@/lib/db'
import { conRol } from '@/lib/guard'

type Params = { params: Promise<{ id: string }> }

// Activar/desactivar o renombrar. `?sub=1` apunta a una subcategoría.
export const PATCH = conRol(['admin'], async (_ctx, req, { params }: Params) => {
  const id = Number((await params).id)
  const b = await req.json().catch(() => ({}))
  const esSub = b.sub === true || b.sub === 1

  const datos: Record<string, unknown> = {}
  if (typeof b.activa === 'boolean') datos.activa = b.activa
  if (b.nombre) datos.nombre = String(b.nombre).trim()
  if (!esSub && b.icono) datos.icono = String(b.icono).trim()

  if (Object.keys(datos).length === 0) {
    return Response.json({ error: 'Nada que cambiar' }, { status: 400 })
  }

  if (esSub) await prisma.subcategoria.update({ where: { id }, data: datos })
  else await prisma.categoria.update({ where: { id }, data: datos })

  return Response.json({ ok: true })
})

// Eliminar, solo si nadie la está usando. Una categoría en uso se DESACTIVA:
// borrarla dejaría publicaciones apuntando a una categoría inexistente y
// rompería el matching de golpe.
export const DELETE = conRol(['admin'], async (_ctx, req, { params }: Params) => {
  const id = Number((await params).id)
  const esSub = new URL(req.url).searchParams.get('sub') === '1'

  if (esSub) {
    const [n, s] = await Promise.all([
      prisma.necesidad.count({ where: { subcategoriaId: id } }),
      prisma.servicio.count({ where: { subcategoriaId: id } }),
    ])
    if (n + s > 0) {
      return Response.json(
        { error: `Hay ${n + s} publicación(es) usando esta subcategoría. Desactívala en vez de borrarla.` },
        { status: 409 },
      )
    }
    await prisma.subcategoria.delete({ where: { id } })
    return Response.json({ ok: true })
  }

  const [n, s] = await Promise.all([
    prisma.necesidad.count({ where: { categoriaId: id } }),
    prisma.servicio.count({ where: { categoriaId: id } }),
  ])
  if (n + s > 0) {
    return Response.json(
      { error: `Hay ${n + s} publicación(es) en esta categoría. Desactívala en vez de borrarla.` },
      { status: 409 },
    )
  }

  await prisma.categoria.delete({ where: { id } })
  return Response.json({ ok: true })
})
