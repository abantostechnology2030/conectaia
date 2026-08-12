import { prisma } from '@/lib/db'
import { conRol } from '@/lib/guard'
import { mover, SinCreditos } from '@/lib/creditos'
import { avisar, TIPOS } from '@/lib/notificaciones'

/**
 * Ajuste manual de créditos por el administrador (PDR §32).
 *
 * Cubre las devoluciones —que NO son automáticas: desbloquear un contacto no
 * devuelve nada por sí solo (PDR §32-33)— y las correcciones. Todo movimiento
 * queda registrado con el admin que lo hizo.
 */
export const POST = conRol(['admin'], async (ctx, req) => {
  const b = await req.json().catch(() => ({}))

  const usuarioId = Number(b.usuarioId)
  const cantidad = Number(b.cantidad)
  const tipo = String(b.tipo ?? 'ajuste')
  const motivo = String(b.motivo ?? '').trim()

  if (!usuarioId) return Response.json({ error: 'Falta el usuario' }, { status: 400 })
  if (!Number.isInteger(cantidad) || cantidad === 0) {
    return Response.json({ error: 'La cantidad debe ser un número entero distinto de cero' }, { status: 400 })
  }
  if (tipo !== 'devolucion' && tipo !== 'ajuste') {
    return Response.json({ error: 'Tipo no válido' }, { status: 400 })
  }
  if (motivo.length < 5) {
    // El motivo es obligatorio a propósito: un ajuste sin explicación deja el
    // histórico inauditable, que es justo lo que el PDR §31 quiere evitar.
    return Response.json({ error: 'Escribe el motivo del ajuste' }, { status: 400 })
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } })
  if (!usuario) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })

  try {
    const saldo = await prisma.$transaction((tx) =>
      mover(tx, { usuarioId, tipo: tipo as 'devolucion' | 'ajuste', cantidad, motivo, adminId: ctx.id }),
    )

    await avisar({
      usuarioId,
      tipo: TIPOS.CREDITOS_AJUSTADOS,
      titulo: cantidad > 0 ? '💳 Recibiste créditos' : '💳 Se ajustó tu saldo',
      mensaje: `${cantidad > 0 ? '+' : ''}${cantidad} crédito(s). ${motivo}`,
      url: '/creditos',
    })

    return Response.json({ ok: true, saldo })
  } catch (e) {
    if (e instanceof SinCreditos) {
      return Response.json({ error: 'El saldo no puede quedar negativo' }, { status: 400 })
    }
    throw e
  }
})
