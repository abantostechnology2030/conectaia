// Visibilidad de los datos privados (PDR §13, §16, §23).
//
// La regla que hay que no romper nunca: paga UN crédito quien INICIA el
// contacto, y a partir de ahí LAS DOS PARTES ven los datos de la otra. Por eso
// `puedeVerContacto` busca la fila de Desbloqueo en los dos sentidos: si solo
// mirara `iniciadorId`, el que recibió el contacto tendría que pagar también
// para responder, que es exactamente lo que el PDR prohíbe.
//
// Da igual por cuál de los tres caminos se llegue (ver `origen` más abajo): lo
// que decide quién paga es QUIÉN DIO EL PRIMER PASO, nunca de qué lado del
// marketplace viene.

import { prisma } from './db'
import type { Prisma } from '@/app/generated/prisma'
import { getValor, aNumero } from './config'
import { mover, SinCreditos } from './creditos'

export type DatosContacto = {
  celular: string | null
  whatsapp: string | null
  email: string | null
  direccion: string | null
}

// Lo que se muestra en lugar de los datos mientras no haya desbloqueo.
export const OCULTO = '••••••••'

/** ¿Puede `miradorId` ver los datos de contacto de `duenoId`? */
export async function puedeVerContacto(miradorId: number, duenoId: number): Promise<boolean> {
  // Uno siempre ve sus propios datos.
  if (miradorId === duenoId) return true

  const fila = await prisma.desbloqueo.findFirst({
    where: {
      OR: [
        { iniciadorId: miradorId, contraparteId: duenoId },
        { iniciadorId: duenoId, contraparteId: miradorId },
      ],
    },
    select: { id: true },
  })
  return !!fila
}

/** Los datos de contacto de un usuario, ya filtrados según quién mira. */
export async function contactoDe(
  miradorId: number,
  duenoId: number,
): Promise<{ visible: boolean; datos: DatosContacto | null }> {
  const visible = await puedeVerContacto(miradorId, duenoId)
  if (!visible) return { visible: false, datos: null }

  const u = await prisma.usuario.findUnique({
    where: { id: duenoId },
    select: { celular: true, whatsapp: true, email: true, direccion: true },
  })
  return { visible: true, datos: u ?? null }
}

/**
 * De una lista de personas, con cuáles ya está abierto el contacto.
 *
 * Una sola consulta en vez de una por fila: el comparador de ofertas necesita
 * saberlo de todos los que ofertaron a la vez, y preguntarlo uno a uno sería
 * una consulta por oferta recibida.
 *
 * Se usa para DECIR LA VERDAD en la interfaz: si ya se pagó por esta pareja,
 * aceptar su oferta no cuesta nada, y tanto el botón como el diálogo tienen que
 * decir eso. Un aviso de "se consumirá 1 crédito" que no se cumple frena
 * exactamente la acción que la plataforma quiere fomentar.
 */
export async function parejasDesbloqueadas(
  miId: number,
  otrosIds: number[],
): Promise<Set<number>> {
  if (otrosIds.length === 0) return new Set()

  const filas = await prisma.desbloqueo.findMany({
    where: {
      OR: [
        { iniciadorId: miId, contraparteId: { in: otrosIds } },
        { contraparteId: miId, iniciadorId: { in: otrosIds } },
      ],
    },
    select: { iniciadorId: true, contraparteId: true },
  })

  return new Set(filas.map((f) => (f.iniciadorId === miId ? f.contraparteId : f.iniciadorId)))
}

export class YaDesbloqueado extends Error {
  constructor() {
    super('Ya tienes desbloqueado este contacto')
  }
}

type PeticionDesbloqueo = {
  iniciadorId: number
  contraparteId: number
  necesidadId?: number | null
  servicioId?: number | null
  // De dónde salió el primer paso. Son los TRES caminos que existen, y cada uno
  // dice quién paga:
  //   · aceptar_oferta      — quien busca acepta una postulación (PDR §14 caso A)
  //   · oportunidad         — quien ofrece contacta por una necesidad (§15 caso B)
  //   · servicio_compatible — quien busca contacta a un profesional que le salió
  //                           como compatible. El espejo del caso B.
  origen: 'aceptar_oferta' | 'oportunidad' | 'servicio_compatible'
  motivo: string
}

/**
 * Cobra el crédito y crea el desbloqueo, todo dentro de una transacción que el
 * llamador provee: aceptar una oferta también cambia el estado de la necesidad
 * y descarta las demás postulaciones, y esas cosas van juntas o no van.
 *
 * Devuelve el desbloqueo creado, o el que ya existía sin volver a cobrar.
 *
 * EL COBRO ES POR PAREJA DE PERSONAS, no por publicación: si A y B ya se
 * desbloquearon una vez, ninguno de los dos vuelve a pagar por contactar al
 * otro, sea cual sea la necesidad. Tiene que ser así porque `puedeVerContacto`
 * también mira la pareja: con el filtro por necesidad que había antes, la
 * segunda necesidad entre las mismas dos personas cobraba un crédito por un
 * teléfono que el usuario YA estaba viendo en pantalla.
 */
export async function cobrarDesbloqueo(tx: Prisma.TransactionClient, p: PeticionDesbloqueo) {
  // Si ya se pagó este contacto (en cualquier sentido) no se cobra otra vez.
  const previo = await tx.desbloqueo.findFirst({
    where: {
      OR: [
        { iniciadorId: p.iniciadorId, contraparteId: p.contraparteId },
        { iniciadorId: p.contraparteId, contraparteId: p.iniciadorId },
      ],
    },
  })
  if (previo) return { desbloqueo: previo, cobrado: 0 }

  const costo = aNumero(await getValor('costo_desbloqueo'), 1)

  const usuario = await tx.usuario.findUnique({
    where: { id: p.iniciadorId },
    select: { creditos: true },
  })
  if (!usuario || usuario.creditos < costo) throw new SinCreditos()

  const desbloqueo = await tx.desbloqueo.create({
    data: {
      iniciadorId: p.iniciadorId,
      contraparteId: p.contraparteId,
      necesidadId: p.necesidadId ?? null,
      servicioId: p.servicioId ?? null,
      origen: p.origen,
      costo,
    },
  })

  await mover(tx, {
    usuarioId: p.iniciadorId,
    tipo: 'consumo',
    cantidad: -costo,
    motivo: p.motivo,
    refTipo: 'desbloqueo',
    refId: desbloqueo.id,
    desbloqueoId: desbloqueo.id,
  })

  return { desbloqueo, cobrado: costo }
}

export { SinCreditos }
