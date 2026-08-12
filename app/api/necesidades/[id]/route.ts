import { prisma } from '@/lib/db'
import { conRol } from '@/lib/guard'
import { revisarTextos, respuestaSiBloqueado } from '@/lib/moderacion'
import { editable } from '@/lib/estados'
import { borrarImagen } from '@/lib/uploads'
import {
  texto,
  textoOpcional,
  numeroOpcional,
  cuandoSeNecesita,
  subcategoriaElegida,
  validarCategoria,
  guardarFotos,
  clavesNecesidad,
} from '@/lib/publicaciones'

type Params = { params: Promise<{ id: string }> }

// Editar una necesidad. Solo su dueño y solo mientras se pueda editar.
export const PATCH = conRol(['usuario'], async (ctx, req, { params }: Params) => {
  const id = Number((await params).id)
  const actual = await prisma.necesidad.findUnique({ where: { id } })

  if (!actual || actual.usuarioId !== ctx.id) {
    return Response.json({ error: 'No encontrada' }, { status: 404 })
  }
  if (!editable(actual.estado)) {
    return Response.json(
      { error: 'Ya no se puede editar: hay una oferta seleccionada o el trabajo terminó' },
      { status: 409 },
    )
  }

  const form = await req.formData()

  const titulo = texto(form.get('titulo'))
  const descripcion = texto(form.get('descripcion'))
  const ciudad = texto(form.get('ciudad'))
  const categoriaId = Number(form.get('categoriaId'))
  const { subcategoriaId, subcategoriaOtra } = subcategoriaElegida(form)
  const observaciones = textoOpcional(form.get('observaciones'))

  if (titulo.length < 5) return Response.json({ error: 'El título es muy corto' }, { status: 400 })
  if (descripcion.length < 20) {
    return Response.json({ error: 'Describe con más detalle lo que necesitas' }, { status: 400 })
  }
  if (!ciudad) return Response.json({ error: 'Escribe la ciudad' }, { status: 400 })

  const errorCat = await validarCategoria(categoriaId, subcategoriaId)
  if (errorCat) return Response.json({ error: errorCat }, { status: 400 })

  try {
    await revisarTextos(ctx.id, 'necesidad', [titulo, descripcion, observaciones])
  } catch (e) {
    const r = respuestaSiBloqueado(e)
    if (r) return r
    throw e
  }

  const [categoria, subcategoria] = await Promise.all([
    prisma.categoria.findUnique({ where: { id: categoriaId } }),
    subcategoriaId ? prisma.subcategoria.findUnique({ where: { id: subcategoriaId } }) : null,
  ])

  // Un borrador editado sigue siendo un borrador: todavía no ha pedido nada.
  const vuelveARevision = actual.estado === 'publicada' || actual.estado === 'rechazada'

  await prisma.necesidad.update({
    where: { id },
    data: {
      titulo,
      descripcion,
      categoriaId,
      subcategoriaId,
      subcategoriaOtra,
      precioOfrecido: numeroOpcional(form.get('precioOfrecido')),
      ciudad,
      distrito: textoOpcional(form.get('distrito')),
      ...cuandoSeNecesita(form),
      horario: textoOpcional(form.get('horario')),
      observaciones,
      claves: clavesNecesidad({
        titulo,
        descripcion,
        categoria: categoria!.nombre,
        // El texto de "Otro" entra en las claves igual que lo haría el nombre
        // de una subcategoría: si no, el matching no lo aprovecharía nunca.
        subcategoria: subcategoria?.nombre ?? subcategoriaOtra ?? undefined,
        observaciones,
      }),
      // ⚠️ Editar lo aprobado lo devuelve a revisión, y esto NO es opcional:
      // sin ello bastaría con publicar algo inocente, esperar el visto bueno y
      // luego editarlo para meter un teléfono. La aprobación sería teatro.
      // Lo rechazado también vuelve a la cola: editarlo es justo lo que se le
      // pidió al usuario.
      ...(vuelveARevision ? { estado: 'en_revision', motivoRechazo: null } : {}),
    },
  })

  await guardarFotos(form, { necesidadId: id }, 'necesidades')

  // Al salir de publicada se retiran sus coincidencias sin usar: mientras se
  // revisa no debe aparecerle a nadie. Las ya contactadas o con postulación se
  // respetan, que son relaciones reales entre personas.
  if (vuelveARevision) {
    await prisma.match.deleteMany({ where: { necesidadId: id, contactoAt: null, postuloAt: null } })
  }

  return Response.json({ ok: true, estado: vuelveARevision ? 'en_revision' : actual.estado })
})

// Eliminar. Solo borradores: una necesidad publicada que recibió ofertas se
// cancela, no se borra, o desaparecería el historial de quienes postularon.
export const DELETE = conRol(['usuario'], async (ctx, _req, { params }: Params) => {
  const id = Number((await params).id)
  const n = await prisma.necesidad.findUnique({
    where: { id },
    include: { fotos: true, _count: { select: { postulaciones: true } } },
  })

  if (!n || n.usuarioId !== ctx.id) return Response.json({ error: 'No encontrada' }, { status: 404 })

  if (n.estado !== 'borrador' && n._count.postulaciones > 0) {
    return Response.json(
      { error: 'Esta necesidad ya recibió ofertas. Puedes cancelarla, pero no eliminarla.' },
      { status: 409 },
    )
  }

  const rutas = n.fotos.map((f) => f.url)
  await prisma.necesidad.delete({ where: { id } })
  // Los archivos se borran DESPUÉS de que la fila se haya ido: si el borrado
  // en base fallara, quedarían fotos sin imagen en pantalla.
  await Promise.all(rutas.map(borrarImagen))

  return Response.json({ ok: true })
})
