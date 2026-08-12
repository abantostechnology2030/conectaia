import { prisma } from '@/lib/db'
import { conRol } from '@/lib/guard'

// Paquetes de créditos (PDR §30). Los valores del seed son un ejemplo, no una
// regla: el admin los cambia desde aquí.
export const POST = conRol(['admin'], async (_ctx, req) => {
  const b = await req.json().catch(() => ({}))

  const nombre = String(b.nombre ?? '').trim()
  const creditos = Number(b.creditos)
  const precio = Number(b.precio)

  if (!nombre) return Response.json({ error: 'Escribe el nombre del paquete' }, { status: 400 })
  if (!Number.isInteger(creditos) || creditos <= 0) {
    return Response.json({ error: 'Los créditos deben ser un entero mayor que cero' }, { status: 400 })
  }
  if (!Number.isFinite(precio) || precio < 0) {
    return Response.json({ error: 'El precio no es válido' }, { status: 400 })
  }

  const ultimo = await prisma.paqueteCredito.findFirst({ orderBy: { orden: 'desc' }, select: { orden: true } })
  const p = await prisma.paqueteCredito.create({
    data: { nombre, creditos, precio, orden: (ultimo?.orden ?? 0) + 1 },
  })

  return Response.json({ ok: true, id: p.id })
})
