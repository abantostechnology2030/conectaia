import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { exigirLado } from '@/lib/modos'
import { Encabezado } from '@/components/Encabezado'
import ServicioForm from '../../ServicioForm'

export const dynamic = 'force-dynamic'

export default async function EditarServicio({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // Este lado del marketplace tiene que estar activado (ver lib/modos.ts).
  await exigirLado('ofrezco')

  const session = await auth()

  const servicio = await prisma.servicio.findUnique({
    where: { id: Number(id) },
    include: { fotos: { orderBy: { orden: 'asc' } } },
  })

  if (!servicio || servicio.usuarioId !== Number(session!.user.id)) notFound()

  const categorias = await prisma.categoria.findMany({
    where: { activa: true },
    include: { subcategorias: { where: { activa: true }, orderBy: { nombre: 'asc' } } },
    orderBy: { orden: 'asc' },
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Encabezado titulo="Editar servicio" subtitulo={servicio.nombre} icono="ofrezco" />
      <ServicioForm categorias={categorias} inicial={servicio} />
    </div>
  )
}
