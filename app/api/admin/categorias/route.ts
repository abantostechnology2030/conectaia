import { prisma } from '@/lib/db'
import { conRol } from '@/lib/guard'

// Crear categoría o subcategoría (PDR §39).
export const POST = conRol(['admin'], async (_ctx, req) => {
  const b = await req.json().catch(() => ({}))
  const nombre = String(b.nombre ?? '').trim()
  const categoriaId = b.categoriaId ? Number(b.categoriaId) : null

  if (nombre.length < 2) return Response.json({ error: 'Escribe un nombre' }, { status: 400 })

  if (categoriaId) {
    const padre = await prisma.categoria.findUnique({ where: { id: categoriaId } })
    if (!padre) return Response.json({ error: 'Esa categoría no existe' }, { status: 404 })

    const repetida = await prisma.subcategoria.findUnique({
      where: { categoriaId_nombre: { categoriaId, nombre } },
      select: { id: true },
    })
    if (repetida) return Response.json({ error: 'Ya existe esa subcategoría' }, { status: 409 })

    const sub = await prisma.subcategoria.create({ data: { categoriaId, nombre } })
    return Response.json({ ok: true, id: sub.id })
  }

  const repetida = await prisma.categoria.findUnique({ where: { nombre }, select: { id: true } })
  if (repetida) return Response.json({ error: 'Ya existe esa categoría' }, { status: 409 })

  const ultima = await prisma.categoria.findFirst({ orderBy: { orden: 'desc' }, select: { orden: true } })
  const cat = await prisma.categoria.create({
    data: { nombre, icono: String(b.icono ?? '🔧').trim(), orden: (ultima?.orden ?? 0) + 1 },
  })
  return Response.json({ ok: true, id: cat.id })
})
