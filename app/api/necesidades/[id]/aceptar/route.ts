import { prisma } from '@/lib/db'
import { conRol } from '@/lib/guard'
import { vetoPorModo } from '@/lib/modos'
import { cobrarDesbloqueo, SinCreditos } from '@/lib/contacto'
import { avisar, avisarVarios, TIPOS } from '@/lib/notificaciones'

type Params = { params: Promise<{ id: string }> }

/**
 * Alguien se adelantó: la necesidad dejó de estar publicada entre que se
 * comprobó y que se intentó tomar.
 *
 * Pasa de verdad con un doble clic —las dos peticiones salen a la vez, las dos
 * leen "publicada" y las dos siguen adelante—. Sin esto, la segunda reventaba
 * al crear el trabajo y el usuario veía un error de base de datos en pantalla.
 */
class YaResuelta extends Error {}

/**
 * ACEPTAR UNA OFERTA (PDR §13, §15 caso A, §42).
 *
 * Es la operación más delicada de la plataforma: cobra el crédito, desbloquea
 * el contacto, crea el trabajo, marca la postulación elegida y descarta las
 * demás. O pasa TODO o no pasa nada, de ahí la transacción: si se cobrara el
 * crédito y luego fallara la creación del trabajo, el usuario habría pagado
 * por un contacto que no existe.
 *
 * Quien paga es quien acepta (el dueño de la necesidad). El proveedor NO paga
 * nada por este mismo contacto (PDR §16).
 */
export const POST = conRol(['usuario'], async (ctx, req, { params }: Params) => {
  // Sin este lado activado no se acepta nada, aunque se llame a la API a mano.
  const veto = await vetoPorModo(ctx.id, 'busco')
  if (veto) return veto

  const necesidadId = Number((await params).id)
  const { postulacionId } = await req.json().catch(() => ({ postulacionId: 0 }))

  const necesidad = await prisma.necesidad.findUnique({ where: { id: necesidadId } })
  if (!necesidad || necesidad.usuarioId !== ctx.id) {
    return Response.json({ error: 'No encontrada' }, { status: 404 })
  }
  if (necesidad.estado !== 'publicada') {
    return Response.json(
      { error: 'Esta necesidad ya no está recibiendo ofertas' },
      { status: 409 },
    )
  }

  const postulacion = await prisma.postulacion.findUnique({
    where: { id: Number(postulacionId) },
    include: { usuario: { select: { id: true, nombres: true, apellidos: true, estado: true } } },
  })
  if (!postulacion || postulacion.necesidadId !== necesidadId) {
    return Response.json({ error: 'Esa oferta no existe' }, { status: 404 })
  }
  if (postulacion.estado !== 'enviada') {
    return Response.json({ error: 'Esa oferta ya no está disponible' }, { status: 409 })
  }
  if (postulacion.usuario.estado === 'suspendido') {
    return Response.json({ error: 'Esa persona ya no está activa en la plataforma' }, { status: 409 })
  }

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      // 0. TOMAR la necesidad antes que nada. El `updateMany` condicionado por
      //    el estado es atómico: si dos peticiones llegan a la vez, solo una
      //    ve `count === 1` y la otra sale por `YaResuelta`. La comprobación de
      //    más arriba no basta —se hizo fuera de la transacción y para entonces
      //    las dos leían "publicada"—, y sin esto la segunda llegaba hasta
      //    `trabajo.create` y chocaba contra el índice único.
      const tomada = await tx.necesidad.updateMany({
        where: { id: necesidadId, estado: 'publicada' },
        data: { estado: 'oferta_seleccionada' },
      })
      if (tomada.count === 0) throw new YaResuelta()

      // 1. Cobrar el crédito y abrir el contacto.
      const { desbloqueo, cobrado } = await cobrarDesbloqueo(tx, {
        iniciadorId: ctx.id,
        contraparteId: postulacion.usuarioId,
        necesidadId,
        servicioId: postulacion.servicioId,
        origen: 'aceptar_oferta',
        motivo: `Aceptaste la oferta de ${postulacion.usuario.nombres} en "${necesidad.titulo}"`,
      })

      // 2. La oferta elegida.
      await tx.postulacion.update({
        where: { id: postulacion.id },
        data: { estado: 'seleccionada' },
      })

      // 3. Las demás quedan descartadas y la necesidad deja de recibir
      //    postulaciones (PDR §11).
      const descartadas = await tx.postulacion.findMany({
        where: { necesidadId, id: { not: postulacion.id }, estado: 'enviada' },
        select: { usuarioId: true },
      })
      await tx.postulacion.updateMany({
        where: { necesidadId, id: { not: postulacion.id }, estado: 'enviada' },
        data: { estado: 'no_seleccionada' },
      })

      // (el estado de la necesidad ya se fijó en el paso 0, al tomarla)

      // 4. El trabajo: es lo único que después permite calificar (PDR §27).
      const trabajo = await tx.trabajo.create({
        data: {
          necesidadId,
          postulacionId: postulacion.id,
          solicitanteId: ctx.id,
          proveedorId: postulacion.usuarioId,
          precioAcordado: postulacion.precio,
          estado: 'en_proceso',
        },
      })

      // 5. Si la oferta nació de una coincidencia, se anota que llegó a
      //    contacto: es la métrica de conversión del PDR §40.
      if (postulacion.servicioId) {
        await tx.match.updateMany({
          where: { necesidadId, servicioId: postulacion.servicioId },
          data: { contactoAt: new Date() },
        })
      }

      return { desbloqueo, cobrado, trabajo, descartadas }
    })

    // Los avisos van FUERA de la transacción: son secundarios y no deben poder
    // deshacer un cobro ya confirmado.
    await avisar({
      usuarioId: postulacion.usuarioId,
      tipo: TIPOS.OFERTA_SELECCIONADA,
      titulo: '🎉 ¡Te seleccionaron!',
      mensaje: `Tu oferta para "${necesidad.titulo}" fue aceptada. Ya puedes ver los datos de contacto para coordinar.`,
      url: `/trabajos/${resultado.trabajo.id}`,
    })

    await avisarVarios(
      resultado.descartadas.map((d) => ({
        usuarioId: d.usuarioId,
        tipo: TIPOS.OFERTA_NO_SELECCIONADA,
        titulo: 'Tu oferta no fue seleccionada',
        mensaje: `Para "${necesidad.titulo}" eligieron otra oferta. Sigue atento a nuevas oportunidades.`,
        url: '/postulaciones',
      })),
    )

    return Response.json({
      ok: true,
      trabajoId: resultado.trabajo.id,
      creditosConsumidos: resultado.cobrado,
    })
  } catch (e) {
    if (e instanceof YaResuelta) {
      return Response.json(
        { error: 'Esta necesidad ya no está recibiendo ofertas', motivo: 'ya_resuelta' },
        { status: 409 },
      )
    }
    if (e instanceof SinCreditos) {
      return Response.json(
        { error: 'No tienes créditos suficientes para desbloquear este contacto', motivo: 'sin_creditos' },
        { status: 402 },
      )
    }
    throw e
  }
})
