import { prisma } from '@/lib/db'
import { conRol } from '@/lib/guard'
import { vetoPorModo } from '@/lib/modos'
import { revisarTextos, respuestaSiBloqueado } from '@/lib/moderacion'
import {
  texto,
  textoOpcional,
  numeroOpcional,
  subcategoriaElegida,
  validarCategoria,
  guardarFotos,
  clavesServicio,
} from '@/lib/publicaciones'

// Crear un servicio (PDR §8).
export const POST = conRol(['usuario'], async (ctx, req) => {
  // Sin este lado activado no se publica, aunque se llame a la API a mano.
  const veto = await vetoPorModo(ctx.id, 'ofrezco')
  if (veto) return veto

  const form = await req.formData()

  const nombre = texto(form.get('nombre'))
  const descripcion = texto(form.get('descripcion'))
  const ciudad = texto(form.get('ciudad'))
  const categoriaId = Number(form.get('categoriaId'))
  const { subcategoriaId, subcategoriaOtra } = subcategoriaElegida(form)
  const experiencia = textoOpcional(form.get('experiencia'))
  const observaciones = textoOpcional(form.get('observaciones'))
  const publicar = form.get('publicar') === '1'

  if (nombre.length < 5) return Response.json({ error: 'El nombre del servicio es muy corto' }, { status: 400 })
  if (descripcion.length < 20) {
    return Response.json(
      { error: 'Describe con más detalle lo que ofreces (al menos 20 caracteres)' },
      { status: 400 },
    )
  }
  if (!ciudad) return Response.json({ error: 'Escribe la ciudad donde trabajas' }, { status: 400 })

  const errorCat = await validarCategoria(categoriaId, subcategoriaId)
  if (errorCat) return Response.json({ error: errorCat }, { status: 400 })

  try {
    await revisarTextos(ctx.id, 'servicio', [nombre, descripcion, experiencia, observaciones])
  } catch (e) {
    const r = respuestaSiBloqueado(e)
    if (r) return r
    throw e
  }

  const [categoria, subcategoria] = await Promise.all([
    prisma.categoria.findUnique({ where: { id: categoriaId } }),
    subcategoriaId ? prisma.subcategoria.findUnique({ where: { id: subcategoriaId } }) : null,
  ])

  const servicio = await prisma.servicio.create({
    data: {
      usuarioId: ctx.id,
      nombre,
      descripcion,
      categoriaId,
      subcategoriaId,
      subcategoriaOtra,
      experiencia,
      ciudad,
      zona: textoOpcional(form.get('zona')),
      precioDesde: numeroOpcional(form.get('precioDesde')),
      disponibilidad: textoOpcional(form.get('disponibilidad')),
      observaciones,
      // "Publicar" NO publica: manda a revisión (ver lib/estados.ts).
      estado: publicar ? 'en_revision' : 'borrador',
      publicadoAt: null,
      claves: clavesServicio({
        nombre,
        descripcion,
        categoria: categoria!.nombre,
        // El texto de "Otro" entra en las claves igual que lo haría el nombre
        // de una subcategoría: si no, el matching no lo aprovecharía nunca.
        subcategoria: subcategoria?.nombre ?? subcategoriaOtra ?? undefined,
        experiencia,
        observaciones,
      }),
    },
  })

  await guardarFotos(form, { servicioId: servicio.id }, 'servicios')

  // Como en las necesidades: el matching se lanza cuando el admin aprueba.
  return Response.json({ ok: true, id: servicio.id, estado: servicio.estado })
})
