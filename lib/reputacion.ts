// Reputación y perfil público (PDR §25, §28).
//
// La media se calcula al vuelo en vez de guardarse en una columna: son pocas
// filas por usuario y una columna desnormalizada se desincroniza en cuanto el
// admin oculta una calificación por moderación.

import { prisma } from './db'

export type Reputacion = {
  promedio: number
  total: number
  trabajosRealizados: number // como proveedor
  trabajosContratados: number // como solicitante
}

export async function reputacionDe(usuarioId: number): Promise<Reputacion> {
  const [agg, realizados, contratados] = await Promise.all([
    prisma.calificacion.aggregate({
      where: { destinatarioId: usuarioId, oculta: false },
      _avg: { estrellas: true },
      _count: true,
    }),
    prisma.trabajo.count({ where: { proveedorId: usuarioId, estado: 'finalizado' } }),
    prisma.trabajo.count({ where: { solicitanteId: usuarioId, estado: 'finalizado' } }),
  ])

  return {
    promedio: agg._avg.estrellas ?? 0,
    total: agg._count,
    trabajosRealizados: realizados,
    trabajosContratados: contratados,
  }
}

/** Reputación de varios usuarios a la vez, para listas de ofertas recibidas. */
export async function reputacionDeVarios(ids: number[]): Promise<Map<number, Reputacion>> {
  const mapa = new Map<number, Reputacion>()
  if (ids.length === 0) return mapa

  const [califs, realizados, contratados] = await Promise.all([
    prisma.calificacion.groupBy({
      by: ['destinatarioId'],
      where: { destinatarioId: { in: ids }, oculta: false },
      _avg: { estrellas: true },
      _count: true,
    }),
    prisma.trabajo.groupBy({
      by: ['proveedorId'],
      where: { proveedorId: { in: ids }, estado: 'finalizado' },
      _count: true,
    }),
    prisma.trabajo.groupBy({
      by: ['solicitanteId'],
      where: { solicitanteId: { in: ids }, estado: 'finalizado' },
      _count: true,
    }),
  ])

  for (const id of ids) {
    const c = califs.find((x) => x.destinatarioId === id)
    mapa.set(id, {
      promedio: c?._avg.estrellas ?? 0,
      total: c?._count ?? 0,
      trabajosRealizados: realizados.find((x) => x.proveedorId === id)?._count ?? 0,
      trabajosContratados: contratados.find((x) => x.solicitanteId === id)?._count ?? 0,
    })
  }

  return mapa
}

/** "⭐ 4.8" o "Sin calificaciones" — un solo texto en toda la app. */
export function textoReputacion(r: Reputacion): string {
  return r.total === 0 ? 'Sin calificaciones aún' : `${r.promedio.toFixed(1)} / 5 · ${r.total} calificación(es)`
}
