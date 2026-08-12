import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Encabezado } from '@/components/Encabezado'
import { Vacio } from '@/components/Vacio'
import { Chip } from '@/components/Chip'
import { Paginacion } from '@/components/Paginacion'
import { POSTULACION } from '@/lib/estados'
import { soles, fechaHora } from '@/lib/fechas'

export const dynamic = 'force-dynamic'

const POR_PAGINA = 25

// Auditoría de postulaciones (PDR §39).
export default async function AdminPostulaciones({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; p?: string }>
}) {
  const sp = await searchParams
  const estado = sp.estado ?? ''

  const donde = estado ? { estado } : {}
  const total = await prisma.postulacion.count({ where: donde })
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA))
  const pagina = Math.min(Math.max(1, Number(sp.p) || 1), paginas)

  const postulaciones = await prisma.postulacion.findMany({
    where: donde,
    include: {
      necesidad: { select: { id: true, titulo: true, precioOfrecido: true, categoria: { select: { nombre: true } } } },
      usuario: { select: { id: true, nombres: true, apellidos: true } },
      servicio: { select: { nombre: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip: (pagina - 1) * POR_PAGINA,
    take: POR_PAGINA,
  })

  const FILTROS = [
    { id: '', label: 'Todas' },
    { id: 'enviada', label: 'Esperando' },
    { id: 'seleccionada', label: 'Seleccionadas' },
    { id: 'no_seleccionada', label: 'No seleccionadas' },
    { id: 'retirada', label: 'Retiradas' },
  ]

  return (
    <div className="space-y-6">
      <Encabezado titulo="Postulaciones" subtitulo={`${total} oferta(s)`} icono="oferta" />

      <div className="scroll-x flex gap-2">
        {FILTROS.map((f) => (
          <Link
            key={f.id}
            href={f.id ? `/admin/postulaciones?estado=${f.id}` : '/admin/postulaciones'}
            className={`chip whitespace-nowrap ${
              estado === f.id
                ? 'border-marca-500 bg-marca-500 text-white'
                : 'border-slate-300 bg-white text-slate-600'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {postulaciones.length === 0 ? (
        <Vacio emoji="📤" titulo="No hay postulaciones con ese filtro" />
      ) : (
        <div className="tarjeta scroll-x">
          <table className="tabla">
            <thead>
              <tr>
                <th>Necesidad</th>
                <th>Categoría</th>
                <th>Quien oferta</th>
                <th>Con el servicio</th>
                <th>Presupuesto</th>
                <th>Ofertado</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {postulaciones.map((p) => (
                <tr key={p.id}>
                  <td className="max-w-56 font-semibold">
                    <Link href={`/p/necesidad/${p.necesidad.id}`} className="hover:underline">
                      {p.necesidad.titulo}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap">{p.necesidad.categoria.nombre}</td>
                  <td className="whitespace-nowrap">
                    <Link href={`/u/${p.usuario.id}`} className="hover:underline">
                      {p.usuario.nombres} {p.usuario.apellidos}
                    </Link>
                  </td>
                  <td className="max-w-40 truncate text-slate-500">{p.servicio?.nombre ?? '—'}</td>
                  <td className="whitespace-nowrap">{soles(p.necesidad.precioOfrecido)}</td>
                  <td className="whitespace-nowrap font-bold text-marca-700">{soles(p.precio)}</td>
                  <td>
                    <Chip {...POSTULACION[p.estado]} />
                  </td>
                  <td className="whitespace-nowrap text-slate-500">{fechaHora(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Paginacion pagina={pagina} paginas={paginas} base="/admin/postulaciones" params={{ estado }} />
    </div>
  )
}
