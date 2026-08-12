import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { exigirLado } from '@/lib/modos'
import { Encabezado } from '@/components/Encabezado'
import { editable } from '@/lib/estados'
import NecesidadForm from '../../NecesidadForm'

export const dynamic = 'force-dynamic'

export default async function EditarNecesidad({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // Este lado del marketplace tiene que estar activado (ver lib/modos.ts).
  await exigirLado('busco')

  const session = await auth()

  const necesidad = await prisma.necesidad.findUnique({
    where: { id: Number(id) },
    include: { fotos: { orderBy: { orden: 'asc' } } },
  })

  if (!necesidad || necesidad.usuarioId !== Number(session!.user.id)) notFound()
  // La API lo vuelve a comprobar; esto evita enseñar un formulario que al
  // guardar iba a fallar igualmente.
  if (!editable(necesidad.estado)) redirect(`/necesidades/${id}`)

  const categorias = await prisma.categoria.findMany({
    where: { activa: true },
    include: { subcategorias: { where: { activa: true }, orderBy: { nombre: 'asc' } } },
    orderBy: { orden: 'asc' },
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Encabezado titulo="Editar necesidad" subtitulo={necesidad.titulo} icono="busco" />
      <NecesidadForm categorias={categorias} inicial={necesidad} />
    </div>
  )
}
