import { prisma } from '@/lib/db'
import { conRol } from '@/lib/guard'
import { revisarTextos, respuestaSiBloqueado } from '@/lib/moderacion'
import { borrarImagen } from '@/lib/uploads'
import {
  texto,
  textoOpcional,
  numeroOpcional,
  subcategoriaElegida,
  validarCategoria,
  guardarFotos,
  clavesServicio,
} from '@/lib/publicaciones'

type Params = { params: Promise<{ id: string }> }

export const PATCH = conRol(['usuario'], async (ctx, req, { params }: Params) => {
  const id = Number((await params).id)
  const actual = await prisma.servicio.findUnique({ where: { id } })

  if (!actual || actual.usuarioId !== ctx.id) {
    return Response.json({ error: 'No encontrado' }, { status: 404 })
  }

  const form = await req.formData()

  const nombre = texto(form.get('nombre'))
  const descripcion = texto(form.get('descripcion'))
  const ciudad = texto(form.get('ciudad'))
  const categoriaId = Number(form.get('categoriaId'))
  const { subcategoriaId, subcategoriaOtra } = subcategoriaElegida(form)
  const experiencia = textoOpcional(form.get('experiencia'))
  const observaciones = textoOpcional(form.get('observaciones'))

  if (nombre.length < 5) return Response.json({ error: 'El nombre del servicio es muy corto' }, { status: 400 })
  if (descripcion.length < 20) {
    return Response.json({ error: 'Describe con más detalle lo que ofreces' }, { status: 400 })
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

  // Mismo criterio que en las necesidades: editar lo aprobado lo devuelve a la
  // cola. Sin esto se publicaría algo inocente y luego se editaría para meter
  // lo que la revisión iba a impedir.
  const vuelveARevision = actual.estado === 'publicado' || actual.estado === 'rechazado'

  await prisma.servicio.update({
    where: { id },
    data: {
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
      ...(vuelveARevision ? { estado: 'en_revision', motivoRechazo: null } : {}),
    },
  })

  await guardarFotos(form, { servicioId: id }, 'servicios')

  if (vuelveARevision) {
    await prisma.match.deleteMany({ where: { servicioId: id, contactoAt: null, postuloAt: null } })
  }

  return Response.json({ ok: true, estado: vuelveARevision ? 'en_revision' : actual.estado })
})

// Eliminar. Si el servicio llegó a usarse en una postulación no se borra: se
// desactiva, o desaparecería el rastro de por qué se contrató a esa persona.
export const DELETE = conRol(['usuario'], async (ctx, _req, { params }: Params) => {
  const id = Number((await params).id)
  const s = await prisma.servicio.findUnique({
    where: { id },
    include: { fotos: true, _count: { select: { postulaciones: true } } },
  })

  if (!s || s.usuarioId !== ctx.id) return Response.json({ error: 'No encontrado' }, { status: 404 })

  if (s._count.postulaciones > 0) {
    return Response.json(
      { error: 'Con este servicio ya te postulaste a alguna necesidad. Puedes desactivarlo, pero no eliminarlo.' },
      { status: 409 },
    )
  }

  const rutas = s.fotos.map((f) => f.url)
  await prisma.servicio.delete({ where: { id } })
  await Promise.all(rutas.map(borrarImagen))

  return Response.json({ ok: true })
})
