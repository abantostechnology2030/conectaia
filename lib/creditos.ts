// Motor de créditos (PDR §14-16, §31-32).
//
// Regla única: TODO cambio de saldo pasa por `mover()`. Nadie escribe
// `usuario.creditos` por su cuenta. Así el histórico de MovimientoCredito
// siempre cuadra con el saldo, que es lo que hace auditable la plataforma.

import { prisma } from './db'
import type { Prisma } from '@/app/generated/prisma'

export type TipoMovimiento = 'recarga' | 'consumo' | 'devolucion' | 'ajuste'

export class SinCreditos extends Error {
  constructor() {
    super('No tienes créditos suficientes')
  }
}

type Movimiento = {
  usuarioId: number
  tipo: TipoMovimiento
  /** Positivo suma, negativo resta. */
  cantidad: number
  motivo: string
  refTipo?: string
  refId?: number
  desbloqueoId?: number
  adminId?: number
}

/**
 * Aplica un movimiento de créditos y devuelve el saldo resultante.
 *
 * Recibe el cliente de transacción como primer argumento porque los dos usos
 * que importan (aceptar una oferta, aprobar una recarga) tienen que ocurrir
 * junto a otros cambios o ninguno: si se cobra el crédito pero falla el
 * desbloqueo, el usuario pagó por nada.
 */
export async function mover(tx: Prisma.TransactionClient, m: Movimiento): Promise<number> {
  const usuario = await tx.usuario.findUnique({
    where: { id: m.usuarioId },
    select: { creditos: true },
  })
  if (!usuario) throw new Error('Usuario no encontrado')

  const saldoDespues = usuario.creditos + m.cantidad
  // El saldo no puede quedar negativo: si esto salta es que alguien llamó sin
  // comprobar antes, o que dos pestañas intentaron gastar el último crédito.
  if (saldoDespues < 0) throw new SinCreditos()

  await tx.usuario.update({
    where: { id: m.usuarioId },
    data: { creditos: saldoDespues },
  })

  await tx.movimientoCredito.create({
    data: {
      usuarioId: m.usuarioId,
      tipo: m.tipo,
      cantidad: m.cantidad,
      saldoDespues,
      motivo: m.motivo,
      refTipo: m.refTipo ?? null,
      refId: m.refId ?? null,
      desbloqueoId: m.desbloqueoId ?? null,
      adminId: m.adminId ?? null,
    },
  })

  return saldoDespues
}

// Saldo actual, para pintarlo en la cabecera y decidir si se ofrece el botón.
export async function saldo(usuarioId: number): Promise<number> {
  const u = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { creditos: true } })
  return u?.creditos ?? 0
}

export const ETIQUETA_MOVIMIENTO: Record<string, string> = {
  recarga: 'Recarga',
  consumo: 'Consumo',
  devolucion: 'Devolución',
  ajuste: 'Ajuste administrativo',
}
