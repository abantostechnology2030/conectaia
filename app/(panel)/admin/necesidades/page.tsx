import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Encabezado } from '@/components/Encabezado'
import { Vacio } from '@/components/Vacio'
import { Chip } from '@/components/Chip'
import { Paginacion } from '@/components/Paginacion'
import { NECESIDAD, ESTADOS_NECESIDAD } from '@/lib/estados'
import { soles, fecha, hace } from '@/lib/fechas'
import ColaAprobacion from '../ColaAprobacion'

export const dynamic = 'force-dynamic'

const POR_PAGINA = 20

// Moderación de necesidades (PDR §39). Suspender aquí = cancelar la
// publicación: el admin no edita el contenido de nadie, lo retira.
export default async function AdminNecesidades({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string; p?: string }>
}) {
  const sp = await searchParams
  const estado = sp.estado ?? ''
  const q = (sp.q ?? '').trim()

  const donde = {
    ...(estado ? { estado } : {}),
    ...(q ? { OR: [{ titulo: { contains: q } }, { descripcion: { contains: q } }, { ciudad: { contains: q } }] } : {}),
  }

  const total = await prisma.necesidad.count({ where: donde })
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA))
  const pagina = Math.min(Math.max(1, Number(sp.p) || 1), paginas)

  const necesidades = await prisma.necesidad.findMany({
    where: donde,
    include: {
      categoria: true,
      usuario: { select: { id: true, nombres: true, apellidos: true } },
      _count: { select: { postulaciones: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip: (pagina - 1) * POR_PAGINA,
    take: POR_PAGINA,
  })

  // La cola va aparte del listado y SIN filtros ni paginación: es trabajo
  // pendiente, no una consulta. Si dependiera del filtro de arriba, bastaría
  // con dejarlo puesto en otro estado para no volver a verla.
  const porAprobar = await prisma.necesidad.findMany({
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
      <Encabezado titulo="Necesidades" subtitulo={`${total} publicación(es)`} icono="busco" />

      <ColaAprobacion
        tipo="necesidad"
        items={porAprobar.map((n) => ({
          id: n.id,
          titulo: n.titulo,
          descripcion: n.descripcion,
          observaciones: n.observaciones,
          categoria: `${n.categoria.icono} ${n.categoria.nombre}`,
          ciudad: n.ciudad,
          autorId: n.usuario.id,
          autor: `${n.usuario.nombres} ${n.usuario.apellidos}`.trim(),
          creada: hace(n.createdAt),
          fotos: n.fotos.map((f) => f.url),
        }))}
      />

      <form method="get" className="tarjeta flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label className="etiqueta" htmlFor="q">
            Buscar
          </label>
          <input id="q" name="q" defaultValue={q} className="campo" placeholder="Título, descripción o ciudad" />
        </div>
        <div>
          <label className="etiqueta" htmlFor="estado">
            Estado
          </label>
          <select id="estado" name="estado" defaultValue={estado} className="campo">
            <option value="">Todos</option>
            {ESTADOS_NECESIDAD.map((e) => (
              <option key={e} value={e}>
                {NECESIDAD[e].texto}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primario">
          Filtrar
        </button>
      </form>

      {necesidades.length === 0 ? (
        <Vacio emoji="🔎" titulo="No hay necesidades con esos filtros" />
      ) : (
        <div className="tarjeta scroll-x">
          <table className="tabla">
            <thead>
              <tr>
                <th>Título</th>
                <th>Categoría</th>
                <th>Autor</th>
                <th>Ciudad</th>
                <th>Presupuesto</th>
                <th>Ofertas</th>
                <th>Estado</th>
                <th>Creada</th>
              </tr>
            </thead>
            <tbody>
              {necesidades.map((n) => (
                <tr key={n.id}>
                  <td className="max-w-64 font-semibold">
                    {n.estado === 'publicada' ? (
                      <Link href={`/p/necesidad/${n.id}`} className="hover:underline">
                        {n.titulo}
                      </Link>
                    ) : (
                      n.titulo
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    {n.categoria.icono} {n.categoria.nombre}
                  </td>
                  <td className="whitespace-nowrap">
                    <Link href={`/u/${n.usuario.id}`} className="hover:underline">
                      {n.usuario.nombres} {n.usuario.apellidos}
                    </Link>
                  </td>
                  <td>{n.ciudad}</td>
                  <td className="whitespace-nowrap">{soles(n.precioOfrecido)}</td>
                  <td className="text-center">{n._count.postulaciones}</td>
                  <td>
                    <Chip {...NECESIDAD[n.estado]} />
                  </td>
                  <td className="whitespace-nowrap text-slate-500">{fecha(n.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Paginacion pagina={pagina} paginas={paginas} base="/admin/necesidades" params={{ estado, q }} />
    </div>
  )
}
