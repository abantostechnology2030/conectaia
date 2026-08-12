// Puente entre la detección de evasión (lib/antievasion.ts) y lo que hace la
// app con ella: registrar la alerta para el admin y, si la configuración lo
// pide, impedir el guardado.
//
// El interruptor `antievasion_bloquea` existe porque ninguna detección por
// patrones es perfecta: si empieza a bloquear publicaciones legítimas, el
// admin la pasa a modo aviso sin tocar código.

import { prisma } from './db'
import { analizar, mensajeBloqueo, type Hallazgo } from './antievasion'
import { getValor, esSi } from './config'
import { recortar } from './texto'

export class TextoBloqueado extends Error {
  constructor(public hallazgos: Hallazgo[]) {
    super(mensajeBloqueo(hallazgos))
  }
}

type Origen = 'necesidad' | 'servicio' | 'postulacion' | 'perfil' | 'calificacion'

/**
 * Revisa uno o varios textos de una misma operación. Si hay hallazgos, deja la
 * alerta registrada y —según configuración— lanza `TextoBloqueado`.
 */
export async function revisarTextos(
  usuarioId: number,
  origen: Origen,
  textos: (string | null | undefined)[],
): Promise<void> {
  const hallazgos: Hallazgo[] = []
  let disparador = ''

  for (const t of textos) {
    const h = analizar(t)
    if (h.length > 0) {
      hallazgos.push(...h)
      if (!disparador) disparador = t ?? ''
    }
  }

  if (hallazgos.length === 0) return

  // Sin repetir el mismo patrón dos veces en la misma alerta.
  const unicos = [...new Map(hallazgos.map((h) => [h.patron, h])).values()]

  await prisma.alertaModeracion
    .create({
      data: {
        usuarioId,
        tipo: 'evasion',
        origen,
        detalle: unicos.map((h) => h.detalle).join(' · '),
        texto: recortar(disparador, 500),
      },
    })
    .catch(() => {}) // registrar la alerta nunca debe tumbar la operación

  if (esSi(await getValor('antievasion_bloquea'))) throw new TextoBloqueado(unicos)
}

/** Traduce TextoBloqueado a una respuesta JSON con el mensaje para el usuario. */
export function respuestaSiBloqueado(e: unknown): Response | null {
  if (e instanceof TextoBloqueado) {
    return Response.json({ error: e.message, motivo: 'antievasion' }, { status: 422 })
  }
  return null
}
