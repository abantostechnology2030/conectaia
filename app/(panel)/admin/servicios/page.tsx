import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Encabezado } from '@/components/Encabezado'
import { Vacio } from '@/components/Vacio'
import { Chip } from '@/components/Chip'
import { Paginacion } from '@/components/Paginacion'
import { SERVICIO, ESTADOS_SERVICIO } from '@/lib/estados'
import { soles, fecha, hace } from '@/lib/fechas'
import ColaAprobacion from '../ColaAprobacion'

export const dynamic = 'force-dynamic'

const POR_PAGINA = 20

export default async function AdminServicios({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string; p?: string }>
}) {
  const sp = await searchParams
  const estado = sp.estado ?? ''
  const q = (sp.q ?? '').trim()

  const donde = {
    ...(estado ? { estado } : {}),
    ...(q ? { OR: [{ nombre: { contains: q } }, { descripcion: { contains: q } }, { ciudad: { contains: q } }] } : {}),
  }

  const total = await prisma.servicio.count({ where: donde })
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA))
  const pagina = Math.min(Math.max(1, Number(sp.p) || 1), paginas)

  const servicios = await prisma.servicio.findMany({
    where: donde,
    include: {
      categoria: true,
      usuario: { select: { id: true, nombres: true, apellidos: true } },
      _count: { select: { coincidencias: true, postulaciones: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip: (pagina - 1) * POR_PAGINA,
    take: POR_PAGINA,
  })

  // Igual que en necesidades: la cola es trabajo pendiente, no una consulta, y
  // por eso no depende de los filtros de abajo.
  const porAprobar = await prisma.servicio.findMany({
    where: { estado: 'en_revision' },
    include: {
      categoria: true,
      usuario: { select: { id: true, nombres: true, apellidos: true } },
      fotos: { orderBy: { orden: 'asc' } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <div className="space-y-6">
      <Encabezado titulo="Servicios" subtitulo={`${total} publicación(es)`} icono="ofrezco" />

      <ColaAprobacion
        tipo="servicio"
        items={porAprobar.map((s) => ({
          id: s.id,
          titulo: s.nombre,
          descripcion: s.descripcion,
          observaciones: s.observaciones,
          categoria: `${s.categoria.icono} ${s.categoria.nombre}`,
          ciudad: s.ciudad,
          autorId: s.usuario.id,
          autor: `${s.usuario.nombres} ${s.usuario.apellidos}`.trim(),
          creada: hace(s.createdAt),
          fotos: s.fotos.map((f) => f.url),
        }))}
      />

      <form method="get" className="tarjeta flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label className="etiqueta" htmlFor="q">
            Buscar
          </label>
          <input id="q" name="q" defaultValue={q} className="campo" placeholder="Nombre, descripción o ciudad" />
        </div>
        <div>
          <label className="etiqueta" htmlFor="estado">
            Estado
          </label>
          <select id="estado" name="estado" defaultValue={estado} className="campo">
            <option value="">Todos</option>
            {ESTADOS_SERVICIO.map((e) => (
              <option key={e} value={e}>
                {SERVICIO[e].texto}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primario">
          Filtrar
        </button>
      </form>

      {servicios.length === 0 ? (
        <Vacio emoji="🛠️" titulo="No hay servicios con esos filtros" />
      ) : (
        <div className="tarjeta scroll-x">
          <table className="tabla">
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Categoría</th>
                <th>Ofrecido por</th>
                <th>Ciudad</th>
                <th>Desde</th>
                <th>Coincidencias</th>
                <th>Ofertas</th>
                <th>Estado</th>
                <th>Creado</th>
              </tr>
            </thead>
            <tbody>
              {servicios.map((s) => (
                <tr key={s.id}>
                  <td className="max-w-64 font-semibold">
                    {s.estado === 'publicado' ? (
                      <Link href={`/p/servicio/${s.id}`} className="hover:underline">
                        {s.nombre}
                      </Link>
                    ) : (
                      s.nombre
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    {s.categoria.icono} {s.categoria.nombre}
                  </td>
                  <td className="whitespace-nowrap">
                    <Link href={`/u/${s.usuario.id}`} className="hover:underline">
                      {s.usuario.nombres} {s.usuario.apellidos}
                    </Link>
                  </td>
                  <td>{s.ciudad}</td>
                  <td className="whitespace-nowrap">{soles(s.precioDesde, '—')}</td>
                  <td className="text-center">{s._count.coincidencias}</td>
                  <td className="text-center">{s._count.postulaciones}</td>
                  <td>
                    <Chip {...SERVICIO[s.estado]} />
                  </td>
                  <td className="whitespace-nowrap text-slate-500">{fecha(s.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Paginacion pagina={pagina} paginas={paginas} base="/admin/servicios" params={{ estado, q }} />
    </div>
  )
}
