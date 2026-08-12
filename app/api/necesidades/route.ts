import { prisma } from '@/lib/db'
import { conRol } from '@/lib/guard'
import { vetoPorModo } from '@/lib/modos'
import { revisarTextos, respuestaSiBloqueado } from '@/lib/moderacion'
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

// Crear una necesidad (PDR §7). Nace en BORRADOR o directamente PUBLICADA
// según el botón que se haya pulsado.
export const POST = conRol(['usuario'], async (ctx, req) => {
  // Sin este lado activado no se publica, aunque se llame a la API a mano.
  const veto = await vetoPorModo(ctx.id, 'busco')
  if (veto) return veto

  const form = await req.formData()

  const titulo = texto(form.get('titulo'))
  const descripcion = texto(form.get('descripcion'))
  const ciudad = texto(form.get('ciudad'))
  const categoriaId = Number(form.get('categoriaId'))
  const { subcategoriaId, subcategoriaOtra } = subcategoriaElegida(form)
  const observaciones = textoOpcional(form.get('observaciones'))
  const publicar = form.get('publicar') === '1'

  if (titulo.length < 5) return Response.json({ error: 'El título es muy corto' }, { status: 400 })
  if (descripcion.length < 20) {
    return Response.json(
      { error: 'Describe con más detalle lo que necesitas (al menos 20 caracteres)' },
      { status: 400 },
    )
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

  const necesidad = await prisma.necesidad.create({
    data: {
      usuarioId: ctx.id,
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
      // "Publicar" NO publica: manda a revisión. La fecha de publicación se
      // fija cuando el administrador aprueba, no ahora, para que la antigüedad
      // que ven los demás sea la de cuando el aviso existió de verdad.
      estado: publicar ? 'en_revision' : 'borrador',
      publicadaAt: null,
      claves: clavesNecesidad({
        titulo,
        descripcion,
        categoria: categoria!.nombre,
        // El texto de "Otro" entra en las claves igual que lo haría el nombre
        // de una subcategoría: si no, el matching no lo aprovecharía nunca.
        subcategoria: subcategoria?.nombre ?? subcategoriaOtra ?? undefined,
        observaciones,
      }),
    },
  })

  await guardarFotos(form, { necesidadId: necesidad.id }, 'necesidades')

  // Aquí NO se calculan coincidencias: solo se cruza lo publicado, y esto
  // todavía está en revisión. El matching se lanza al aprobar.
  return Response.json({ ok: true, id: necesidad.id, estado: necesidad.estado })
})
