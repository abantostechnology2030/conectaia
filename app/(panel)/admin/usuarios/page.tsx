import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Encabezado } from '@/components/Encabezado'
import { Avatar } from '@/components/Avatar'
import { Estrellas } from '@/components/Estrellas'
import { Paginacion } from '@/components/Paginacion'
import { Vacio } from '@/components/Vacio'
import { reputacionDeVarios } from '@/lib/reputacion'
import { fecha } from '@/lib/fechas'
import AccionesUsuario from './AccionesUsuario'

export const dynamic = 'force-dynamic'

const POR_PAGINA = 20

const FILTROS = [
  { id: '', label: 'Todos' },
  { id: 'activo', label: 'Activos' },
  { id: 'suspendido', label: 'Suspendidos' },
]

export default async function AdminUsuarios({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string; p?: string }>
}) {
  const sp = await searchParams
  const estado = sp.estado ?? ''
  const q = (sp.q ?? '').trim()

  const donde = {
    rol: 'usuario',
    ...(estado ? { estado } : {}),
    ...(q
      ? {
          OR: [
            { nombres: { contains: q } },
            { apellidos: { contains: q } },
            { email: { contains: q } },
            { ciudad: { contains: q } },
          ],
        }
      : {}),
  }

  const total = await prisma.usuario.count({ where: donde })
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA))
  const pagina = Math.min(Math.max(1, Number(sp.p) || 1), paginas)

  const usuarios = await prisma.usuario.findMany({
    where: donde,
    include: {
      _count: { select: { necesidades: true, servicios: true, postulaciones: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip: (pagina - 1) * POR_PAGINA,
    take: POR_PAGINA,
  })

  const reps = await reputacionDeVarios(usuarios.map((u) => u.id))

  return (
    <div className="space-y-6">
      <Encabezado titulo="Usuarios" subtitulo={`${total} cuenta(s)`} icono="usuarios" />

      <form method="get" className="tarjeta flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label className="etiqueta" htmlFor="q">
            Buscar
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            className="campo"
            placeholder="Nombre, correo o ciudad"
          />
        </div>
        <input type="hidden" name="estado" value={estado} />
        <button type="submit" className="btn-primario">
          Buscar
        </button>
      </form>

      <div className="flex gap-2">
        {FILTROS.map((f) => (
          <Link
            key={f.id}
            href={`/admin/usuarios?estado=${f.id}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
            className={`chip ${
              estado === f.id
                ? 'border-marca-500 bg-marca-500 text-white'
                : 'border-slate-300 bg-white text-slate-600'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {usuarios.length === 0 ? (
        <Vacio emoji="👤" titulo="No hay usuarios con esos filtros" />
      ) : (
        <div className="space-y-3">
          {usuarios.map((u) => {
            const nombre = `${u.nombres} ${u.apellidos}`.trim()
            const r = reps.get(u.id)
            return (
              <article key={u.id} className="tarjeta">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar src={u.fotoUrl} nombre={nombre} tam={48} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/u/${u.id}`} className="font-bold text-slate-800 hover:underline">
                          {nombre}
                        </Link>
                        <span
                          className={`chip ${
                            u.estado === 'activo'
                              ? 'border-menta-300 bg-menta-50 text-menta-700'
                              : 'border-rose-200 bg-rose-50 text-rose-700'
                          }`}
                        >
                          {u.estado === 'activo' ? 'Activo' : 'Suspendido'}
                        </span>
                      </div>
                      <p className="truncate text-sm text-slate-500">{u.email}</p>
                      <p className="text-sm text-slate-500">
                        {u.ciudad ?? 'Sin ciudad'} · Registrado {fecha(u.createdAt)}
                      </p>
                      <div className="mt-1">
                        <Estrellas valor={r?.promedio ?? 0} total={r?.total ?? 0} />
                      </div>
                    </div>
                  </div>

                  <dl className="flex gap-4 text-center text-sm">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-400">Créditos</dt>
                      <dd className="text-xl font-extrabold text-marca-700">{u.creditos}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-400">Necesidades</dt>
                      <dd className="text-xl font-extrabold text-slate-700">{u._count.necesidades}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-400">Servicios</dt>
                      <dd className="text-xl font-extrabold text-slate-700">{u._count.servicios}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-400">Ofertas</dt>
                      <dd className="text-xl font-extrabold text-slate-700">{u._count.postulaciones}</dd>
                    </div>
                  </dl>
                </div>

                <div className="mt-3 border-t border-slate-100 pt-3">
                  <AccionesUsuario id={u.id} nombre={nombre} estado={u.estado} creditos={u.creditos} />
                </div>
              </article>
            )
          })}
        </div>
      )}

      <Paginacion pagina={pagina} paginas={paginas} base="/admin/usuarios" params={{ estado, q }} />
    </div>
  )
}
