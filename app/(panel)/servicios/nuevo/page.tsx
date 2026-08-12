import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { exigirLado } from '@/lib/modos'
import { Encabezado } from '@/components/Encabezado'
import ServicioForm from '../ServicioForm'

export const dynamic = 'force-dynamic'

export default async function NuevoServicio() {
  // Este lado del marketplace tiene que estar activado (ver lib/modos.ts).
  await exigirLado('ofrezco')

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
        titulo="Publicar un servicio"
        subtitulo="Cuenta qué sabes hacer y encuentra oportunidades"
        icono="ofrezco"
      />
      <ServicioForm categorias={categorias} ciudadPorDefecto={yo?.ciudad} />
    </div>
  )
}
