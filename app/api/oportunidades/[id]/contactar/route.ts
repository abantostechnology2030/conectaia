import { prisma } from '@/lib/db'
import { conRol } from '@/lib/guard'
import { vetoPorModo } from '@/lib/modos'
import { cobrarDesbloqueo, SinCreditos } from '@/lib/contacto'
import { avisar, TIPOS } from '@/lib/notificaciones'

type Params = { params: Promise<{ id: string }> }

/**
 * DAR EL PRIMER PASO DESDE UNA COINCIDENCIA.
 *
 * Una fila de `Match` une una necesidad y un servicio, y **cualquiera de los dos
 * dueños puede ser quien decida hablar primero**:
 *
 *   · Caso B (PDR §15) — el dueño del SERVICIO ve una necesidad compatible y
 *     contacta. Paga él.
 *   · Caso C           — el dueño de la NECESIDAD ve un profesional compatible
 *     y contacta. Paga él. Es el espejo exacto del anterior.
 *
 * En los dos, **la contraparte no paga nada** y a partir de ahí ambos ven los
 * datos del otro. Quien paga es quien da el primer paso, nunca el lado del
 * marketplace del que venga.
 *
 * Ojo con lo que este endpoint NO hace: no crea un trabajo ni contrata nada
 * (PDR §22). Solo abre el canal para que las dos personas hablen.
 */
export const POST = conRol(['usuario'], async (ctx, _req, { params }: Params) => {
  const id = Number((await params).id)

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      necesidad: {
        select: {
          id: true,
          titulo: true,
          estado: true,
          usuarioId: true,
          usuario: { select: { id: true, nombres: true, estado: true } },
        },
      },
      servicio: {
        select: {
          id: true,
          nombre: true,
          estado: true,
          usuarioId: true,
          usuario: { select: { id: true, nombres: true, estado: true } },
        },
      },
    },
  })
  if (!match) return Response.json({ error: 'Esa coincidencia no existe' }, { status: 404 })

  // Solo los dos implicados. Un tercero no tiene nada que hacer aquí, aunque
  // adivine el número de la coincidencia.
  const esOferente = match.servicio.usuarioId === ctx.id
  const esDemandante = match.necesidad.usuarioId === ctx.id
  if (!esOferente && !esDemandante) {
    return Response.json({ error: 'No autorizado' }, { status: 403 })
  }

  // Se contacta desde el lado en el que uno está mirando: quien tiene el panel
  // de "necesito" no contacta como proveedor, y al revés.
  const veto = await vetoPorModo(ctx.id, esOferente ? 'ofrezco' : 'busco')
  if (veto) return veto

  // La publicación de la OTRA parte tiene que seguir en pie: es por lo que se
  // contacta. La propia no se comprueba a propósito — que yo haya pausado mi
  // servicio no me impide escribirle a alguien que necesita eso mismo.
  if (esOferente && match.necesidad.estado !== 'publicada') {
    return Response.json({ error: 'Esa necesidad ya no está abierta' }, { status: 409 })
  }
  if (esDemandante && match.servicio.estado !== 'publicado') {
    return Response.json({ error: 'Ese servicio ya no está disponible' }, { status: 409 })
  }

  const contraparte = esOferente ? match.necesidad.usuario : match.servicio.usuario
  if (contraparte.estado === 'suspendido') {
    return Response.json({ error: 'Esa persona ya no está activa en la plataforma' }, { status: 409 })
  }

  const motivo = esOferente
    ? `Contactaste por la oportunidad "${match.necesidad.titulo}"`
    : `Contactaste al profesional de "${match.servicio.nombre}"`

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const r = await cobrarDesbloqueo(tx, {
        iniciadorId: ctx.id,
        contraparteId: contraparte.id,
        necesidadId: match.necesidadId,
        servicioId: match.servicioId,
        origen: esOferente ? 'oportunidad' : 'servicio_compatible',
        motivo,
      })

      await tx.match.update({ where: { id }, data: { contactoAt: new Date() } })

      return r
    })

    // Solo se avisa si de verdad se acaba de abrir el contacto: si ya estaba
    // desbloqueado, `cobrado` es 0 y volver a avisar sería ruido.
    if (resultado.cobrado > 0) {
      await avisar(
        esOferente
          ? {
              usuarioId: match.necesidad.usuarioId,
              tipo: TIPOS.SERVICIO_INTERESADO,
              titulo: '🤝 Alguien quiere ayudarte',
              mensaje: `Un profesional de "${match.servicio.nombre}" desbloqueó el contacto para tu necesidad "${match.necesidad.titulo}". Ya pueden coordinar.`,
              url: `/necesidades/${match.necesidadId}`,
            }
          : {
              usuarioId: match.servicio.usuarioId,
              tipo: TIPOS.CLIENTE_INTERESADO,
              titulo: '🙋 Alguien necesita lo que ofreces',
              mensaje: `Quien publicó "${match.necesidad.titulo}" desbloqueó el contacto con tu servicio "${match.servicio.nombre}". Ya pueden coordinar, y a ti no te cuesta ningún crédito.`,
              url: `/oportunidades/${match.id}`,
            },
      )
    }

    return Response.json({ ok: true, creditosConsumidos: resultado.cobrado })
  } catch (e) {
    if (e instanceof SinCreditos) {
      return Response.json(
        { error: 'No tienes créditos suficientes para desbloquear este contacto', motivo: 'sin_creditos' },
        { status: 402 },
      )
    }
    throw e
  }
})
