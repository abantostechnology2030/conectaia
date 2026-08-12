import { prisma } from '@/lib/db'
import { conSesion } from '@/lib/guard'
import { revisarTextos, respuestaSiBloqueado } from '@/lib/moderacion'
import { guardarImagen, borrarImagen } from '@/lib/uploads'
import { texto, textoOpcional } from '@/lib/publicaciones'

// Editar el propio perfil (PDR §25).
export const PATCH = conSesion(async (ctx, req) => {
  const form = await req.formData()

  const nombres = texto(form.get('nombres'))
  const apellidos = texto(form.get('apellidos'))
  const ciudad = texto(form.get('ciudad'))
  const descripcion = textoOpcional(form.get('descripcion'))
  const celular = textoOpcional(form.get('celular'))
  const whatsapp = textoOpcional(form.get('whatsapp'))

  if (!nombres || !apellidos) {
    return Response.json({ error: 'Escribe tus nombres y apellidos' }, { status: 400 })
  }
  if (!ciudad) return Response.json({ error: 'Escribe tu ciudad' }, { status: 400 })
  if (celular && !/^\d{9}$/.test(celular.replace(/\s/g, ''))) {
    return Response.json({ error: 'El celular debe tener 9 dígitos' }, { status: 400 })
  }

  // La descripción es pública, así que pasa por el filtro de evasión igual que
  // una publicación: es un sitio evidente donde poner el teléfono.
  try {
    await revisarTextos(ctx.id, 'perfil', [descripcion])
  } catch (e) {
    const r = respuestaSiBloqueado(e)
    if (r) return r
    throw e
  }

  const foto = form.get('foto')
  let fotoUrl: string | undefined

  if (foto instanceof File && foto.size > 0) {
    const antes = await prisma.usuario.findUnique({
      where: { id: ctx.id },
      select: { fotoUrl: true },
    })
    try {
      fotoUrl = await guardarImagen(foto, 'perfiles', `u${ctx.id}`)
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 400 })
    }
    await borrarImagen(antes?.fotoUrl)
  }

  await prisma.usuario.update({
    where: { id: ctx.id },
    data: {
      nombres,
      apellidos,
      ciudad,
      distrito: textoOpcional(form.get('distrito')),
      direccion: textoOpcional(form.get('direccion')),
      dni: textoOpcional(form.get('dni')),
      celular: celular?.replace(/\s/g, '') ?? null,
      whatsapp: whatsapp?.replace(/\s/g, '') ?? null,
      descripcion,
      ...(fotoUrl ? { fotoUrl } : {}),
    },
  })

  return Response.json({ ok: true })
})
