import { prisma } from '@/lib/db'
import { conRol } from '@/lib/guard'
import { guardarImagen } from '@/lib/uploads'
import { textoOpcional } from '@/lib/publicaciones'

// Solicitar una recarga de créditos con comprobante de Yape (PDR §29).
// Queda PENDIENTE hasta que el administrador la revise; los créditos NO se
// acreditan aquí.
export const POST = conRol(['usuario'], async (ctx, req) => {
  const form = await req.formData()

  const paqueteId = Number(form.get('paqueteId'))
  const comprobante = form.get('comprobante')

  if (!paqueteId) return Response.json({ error: 'Elige un paquete' }, { status: 400 })
  if (!(comprobante instanceof File) || comprobante.size === 0) {
    return Response.json({ error: 'Adjunta la captura de tu pago' }, { status: 400 })
  }

  const paquete = await prisma.paqueteCredito.findUnique({ where: { id: paqueteId } })
  if (!paquete || !paquete.activo) {
    return Response.json({ error: 'Ese paquete no está disponible' }, { status: 400 })
  }

  // Una sola solicitud en cola por persona: con varias abiertas, el admin no
  // sabe cuál corresponde a qué pago y es fácil acreditar de más.
  const pendiente = await prisma.recarga.findFirst({
    where: { usuarioId: ctx.id, estado: 'pendiente' },
    select: { id: true },
  })
  if (pendiente) {
    return Response.json({ error: 'Ya tienes una recarga pendiente de revisión' }, { status: 409 })
  }

  let ruta: string
  try {
    ruta = await guardarImagen(comprobante, 'comprobantes', `u${ctx.id}`)
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 })
  }

  const recarga = await prisma.recarga.create({
    data: {
      usuarioId: ctx.id,
      paqueteId,
      // Se congela lo que valía el paquete al solicitarlo: si el admin sube el
      // precio mañana, esta solicitud sigue siendo por lo que la persona pagó.
      creditos: paquete.creditos,
      monto: paquete.precio,
      comprobante: ruta,
      operacion: textoOpcional(form.get('operacion')),
    },
  })

  return Response.json({ ok: true, id: recarga.id })
})
