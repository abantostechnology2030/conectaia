// Notificaciones dentro de la app (PDR §38).
//
// Sin correo ni WhatsApp en el MVP: se guardan en la tabla y se leen en la
// campana del panel. El tipo es una cadena y no un enum de Prisma porque
// SQLite no tiene enums y porque cambiar la lista no debe obligar a migrar.

import { prisma } from './db'

export const TIPOS = {
  // Para quien busca (publicó una necesidad)
  NUEVA_OFERTA: 'nueva_oferta',
  NUEVA_COINCIDENCIA: 'nueva_coincidencia',
  SERVICIO_INTERESADO: 'servicio_interesado',
  // Para quien ofrece (publicó un servicio)
  NUEVA_OPORTUNIDAD: 'nueva_oportunidad',
  CLIENTE_INTERESADO: 'cliente_interesado',
  OFERTA_SELECCIONADA: 'oferta_seleccionada',
  OFERTA_NO_SELECCIONADA: 'oferta_no_seleccionada',
  // Comunes
  PUBLICACION_APROBADA: 'publicacion_aprobada',
  PUBLICACION_RECHAZADA: 'publicacion_rechazada',
  TRABAJO_FINALIZADO: 'trabajo_finalizado',
  CALIFICACION_PENDIENTE: 'calificacion_pendiente',
  CALIFICACION_RECIBIDA: 'calificacion_recibida',
  RECARGA_APROBADA: 'recarga_aprobada',
  RECARGA_RECHAZADA: 'recarga_rechazada',
  CREDITOS_AJUSTADOS: 'creditos_ajustados',
  CUENTA_SUSPENDIDA: 'cuenta_suspendida',
} as const

export const ICONO_NOTIFICACION: Record<string, string> = {
  nueva_oferta: '📨',
  nueva_coincidencia: '🎯',
  servicio_interesado: '🤝',
  nueva_oportunidad: '🎯',
  cliente_interesado: '🙋',
  publicacion_aprobada: '✅',
  publicacion_rechazada: '⚠️',
  oferta_seleccionada: '🎉',
  oferta_no_seleccionada: '😔',
  trabajo_finalizado: '✅',
  calificacion_pendiente: '⭐',
  calificacion_recibida: '⭐',
  recarga_aprobada: '💳',
  recarga_rechazada: '⚠️',
  creditos_ajustados: '💳',
  cuenta_suspendida: '🚫',
}

type Aviso = {
  usuarioId: number
  tipo: string
  titulo: string
  mensaje: string
  url?: string
}

/**
 * Crea una notificación. Nunca lanza: un fallo al avisar no puede tumbar la
 * operación que lo provocó (aceptar una oferta tiene que completarse aunque la
 * notificación no se guarde).
 */
export async function avisar(a: Aviso): Promise<void> {
  try {
    await prisma.notificacion.create({
      data: {
        usuarioId: a.usuarioId,
        tipo: a.tipo,
        titulo: a.titulo,
        mensaje: a.mensaje,
        url: a.url ?? null,
      },
    })
  } catch (e) {
    console.error('[notificaciones] no se pudo avisar:', (e as Error).message)
  }
}

/** Varias de una vez (por ejemplo, avisar a todos los no seleccionados). */
export async function avisarVarios(avisos: Aviso[]): Promise<void> {
  if (avisos.length === 0) return
  try {
    await prisma.notificacion.createMany({
      data: avisos.map((a) => ({
        usuarioId: a.usuarioId,
        tipo: a.tipo,
        titulo: a.titulo,
        mensaje: a.mensaje,
        url: a.url ?? null,
      })),
    })
  } catch (e) {
    console.error('[notificaciones] no se pudo avisar en lote:', (e as Error).message)
  }
}

export async function sinLeer(usuarioId: number): Promise<number> {
  return prisma.notificacion.count({ where: { usuarioId, leida: false } })
}
