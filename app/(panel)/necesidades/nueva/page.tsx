import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { exigirLado } from '@/lib/modos'
import { Encabezado } from '@/components/Encabezado'
import NecesidadForm from '../NecesidadForm'

export const dynamic = 'force-dynamic'

export default async function NuevaNecesidad() {
  // Este lado del marketplace tiene que estar activado (ver lib/modos.ts).
  await exigirLado('busco')

  const session = await auth()

  const [categorias, yo] = await Promise.all([
    prisma.categoria.findMany({
      where: { activa: true },
      include: { subcategorias: { where: { activa: true }, orderBy: { nombre: 'asc' } } },
      orderBy: { orden: 'asc' },
    }),
    prisma.usuario.findUnique({
      where: { id: Number(session!.user.id) },
      select: { ciudad: true },
    }),
  ])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Encabezado
        titulo="Publicar una necesidad"
        subtitulo="Cuenta qué necesitas y recibe ofertas"
        icono="busco"
      />
      <NecesidadForm categorias={categorias} ciudadPorDefecto={yo?.ciudad} />
    </div>
  )
}
