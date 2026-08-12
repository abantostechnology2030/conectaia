import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Encabezado } from '@/components/Encabezado'
import GestorCategorias, { type CategoriaAdmin } from './GestorCategorias'

export const dynamic = 'force-dynamic'

export default async function AdminCategorias() {
  const categorias = await prisma.categoria.findMany({
    include: {
      subcategorias: {
        include: { _count: { select: { necesidades: true, servicios: true } } },
        orderBy: { nombre: 'asc' },
      },
      _count: { select: { necesidades: true, servicios: true } },
    },
    orderBy: { orden: 'asc' },
  })

  // "En uso" suma los dos lados: una categoría con servicios pero sin
  // necesidades sigue estando en uso y no se puede borrar.
  const datos: CategoriaAdmin[] = categorias.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    icono: c.icono,
    activa: c.activa,
    enUso: c._count.necesidades + c._count.servicios,
    subcategorias: c.subcategorias.map((s) => ({
      id: s.id,
      nombre: s.nombre,
      activa: s.activa,
      enUso: s._count.necesidades + s._count.servicios,
    })),
  }))

  const totalSubs = datos.reduce((t, c) => t + c.subcategorias.length, 0)

  return (
    <div className="space-y-6">
      {/* Esta pantalla ya no está en el menú lateral: se entra desde
          Configuración, así que la vuelta tiene que estar aquí o no hay forma
          de salir sin el botón "atrás" del navegador. */}
      <Encabezado
        titulo="Categorías"
        subtitulo={`${datos.length} categorías y ${totalSubs} subcategorías`}
        icono="catalogo"
      >
        <Link href="/admin/configuracion" className="btn-secundario">
          Volver a Configuración
        </Link>
      </Encabezado>

      <p className="rounded-xl border border-marca-200 bg-marca-50 px-4 py-3 text-sm text-marca-800">
        Las categorías son la base del matching: es el factor de más peso al comparar una necesidad
        con un servicio. Lo que ya esté en uso se desactiva en vez de borrarse.
      </p>

      <GestorCategorias categorias={datos} />
    </div>
  )
}
