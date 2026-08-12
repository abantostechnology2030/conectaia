import { conRol } from '@/lib/guard'
import { borrarFoto } from '@/lib/publicaciones'

type Params = { params: Promise<{ id: string }> }

// Quitar una foto de una publicación. La comprobación de propiedad vive en
// `borrarFoto`, que mira de quién es la necesidad o el servicio al que
// pertenece la imagen.
export const DELETE = conRol(['usuario'], async (ctx, _req, { params }: Params) => {
  const id = Number((await params).id)
  const ok = await borrarFoto(id, ctx.id)
  if (!ok) return Response.json({ error: 'No encontrada' }, { status: 404 })
  return Response.json({ ok: true })
})
