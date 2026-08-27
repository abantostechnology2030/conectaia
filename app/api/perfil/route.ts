import { prisma } from '@/lib/db'
import { conSesion } from '@/lib/guard'
import { revisarTextos, respuestaSiBloqueado } from '@/lib/moderacion'
import { guardarImagen, borrarImagen } from '@/lib/uploads'
import { texto, textoOpcional, guardarFotos } from '@/lib/publicaciones'
import { normalizarDni, dniValido, ERROR_DNI } from '@/lib/dni'

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

  const actual = await prisma.usuario.findUnique({
    where: { id: ctx.id },
    select: { dni: true, fotoUrl: true, esPersonaConDiscapacidad: true },
  })

  // El DNI solo se escribe si la cuenta todavía no tiene uno (las de antes de
  // que se pidiera en el registro). Ni se cambia ni se vacía: es lo que
  // sostiene "una persona, una cuenta", y el formulario ya lo enseña como dato
  // fijo — pero la comprobación tiene que estar AQUÍ, o bastaría con mandar el
  // campo desde la consola del navegador.
  let dni: string | undefined
  if (!actual?.dni) {
    const escrito = normalizarDni(form.get('dni'))
    if (escrito) {
      if (!dniValido(escrito)) {
        return Response.json({ error: ERROR_DNI }, { status: 400 })
      }
      const otro = await prisma.usuario.findFirst({
        where: { dni: escrito, id: { not: ctx.id } },
        select: { id: true },
      })
      if (otro) {
        return Response.json({ error: 'Ese DNI ya está en otra cuenta' }, { status: 409 })
      }
      dni = escrito
    }
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
    try {
      fotoUrl = await guardarImagen(foto, 'perfiles', `u${ctx.id}`)
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 400 })
    }
    await borrarImagen(actual?.fotoUrl)
  }

  await prisma.usuario.update({
    where: { id: ctx.id },
    data: {
      nombres,
      apellidos,
      ciudad,
      distrito: textoOpcional(form.get('distrito')),
      direccion: textoOpcional(form.get('direccion')),
      ...(dni ? { dni } : {}),
      celular: celular?.replace(/\s/g, '') ?? null,
      whatsapp: whatsapp?.replace(/\s/g, '') ?? null,
      descripcion,
      ...(fotoUrl ? { fotoUrl } : {}),
    },
  })

  // Las fotos de habilidades/trabajos solo existen para cuentas "persona con
  // discapacidad": el formulario no las ofrece a nadie más, y la comprobación
  // tiene que estar también aquí, o bastaría con mandar el campo `fotos`
  // desde la consola del navegador.
  if (actual?.esPersonaConDiscapacidad) {
    await guardarFotos(form, { usuarioId: ctx.id }, 'habilidades')
  }

  return Response.json({ ok: true })
})
