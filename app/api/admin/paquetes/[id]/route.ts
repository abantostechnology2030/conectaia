import { prisma } from '@/lib/db'
import { conRol } from '@/lib/guard'

type Params = { params: Promise<{ id: string }> }

export const PATCH = conRol(['admin'], async (_ctx, req, { params }: Params) => {
  const id = Number((await params).id)
  const b = await req.json().catch(() => ({}))

  const datos: Record<string, unknown> = {}
  if (b.nombre) datos.nombre = String(b.nombre).trim()
  if (b.creditos !== undefined) {
    const c = Number(b.creditos)
    if (!Number.isInteger(c) || c <= 0) {
      return Response.json({ error: 'Los créditos deben ser un entero mayor que cero' }, { status: 400 })
    }
    datos.creditos = c
  }
  if (b.precio !== undefined) {
    const p = Number(b.precio)
    if (!Number.isFinite(p) || p < 0) return Response.json({ error: 'Precio no válido' }, { status: 400 })
    datos.precio = p
  }
  if (typeof b.activo === 'boolean') datos.activo = b.activo

  if (Object.keys(datos).length === 0) {
    return Response.json({ error: 'Nada que cambiar' }, { status: 400 })
  }

  await prisma.paqueteCredito.update({ where: { id }, data: datos })
  return Response.json({ ok: true })
})

// Un paquete con recargas asociadas se DESACTIVA, no se borra: las recargas
// guardan su historia apuntándolo, y borrarlo dejaría el histórico roto.
export const DELETE = conRol(['admin'], async (_ctx, _req, { params }: Params) => {
  const id = Number((await params).id)

  const usos = await prisma.recarga.count({ where: { paqueteId: id } })
  if (usos > 0) {
    return Response.json(
      { error: `Este paquete tiene ${usos} recarga(s) registradas. Desactívalo en vez de borrarlo.` },
      { status: 409 },
    )
  }

  await prisma.paqueteCredito.delete({ where: { id } })
  return Response.json({ ok: true })
})
