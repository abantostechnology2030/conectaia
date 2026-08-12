import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Encabezado } from '@/components/Encabezado'
import { Vacio } from '@/components/Vacio'
import { Estrellas } from '@/components/Estrellas'
import { Avatar } from '@/components/Avatar'
import { Paginacion } from '@/components/Paginacion'
import { fechaHora } from '@/lib/fechas'
import OcultarCalificacion from './OcultarCalificacion'

export const dynamic = 'force-dynamic'

const POR_PAGINA = 20

// Moderación de calificaciones (PDR §39). Ocultar no borra: la fila se
// conserva para poder auditar el caso, pero deja de contar en la reputación.
export default async function AdminCalificaciones({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; p?: string }>
}) {
  const sp = await searchParams
  const filtro = sp.filtro ?? ''

  const donde =
    filtro === 'ocultas'
      ? { oculta: true }
      : filtro === 'bajas'
        ? { estrellas: { lte: 2 }, oculta: false }
        : {}

  const total = await prisma.calificacion.count({ where: donde })
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA))
  const pagina = Math.min(Math.max(1, Number(sp.p) || 1), paginas)

  const calificaciones = await prisma.calificacion.findMany({
    where: donde,
    include: {
      autor: { select: { id: true, nombres: true, apellidos: true, fotoUrl: true } },
      destinatario: { select: { id: true, nombres: true, apellidos: true } },
      trabajo: { select: { id: true, necesidad: { select: { titulo: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    skip: (pagina - 1) * POR_PAGINA,
    take: POR_PAGINA,
  })

  const FILTROS = [
    { id: '', label: 'Todas' },
    { id: 'bajas', label: '1 y 2 estrellas' },
    { id: 'ocultas', label: 'Ocultas' },
  ]

  return (
    <div className="space-y-6">
      <Encabezado titulo="Calificaciones" subtitulo={`${total} calificación(es)`} icono="estrella" />

      <div className="flex gap-2">
        {FILTROS.map((f) => (
          <Link
            key={f.id}
            href={f.id ? `/admin/calificaciones?filtro=${f.id}` : '/admin/calificaciones'}
            className={`chip ${
              filtro === f.id
                ? 'border-marca-500 bg-marca-500 text-white'
                : 'border-slate-300 bg-white text-slate-600'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {calificaciones.length === 0 ? (
        <Vacio emoji="⭐" titulo="No hay calificaciones con ese filtro" />
      ) : (
        <div className="space-y-3">
          {calificaciones.map((c) => (
            <article key={c.id} className={`tarjeta ${c.oculta ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar
                    src={c.autor.fotoUrl}
                    nombre={`${c.autor.nombres} ${c.autor.apellidos}`}
                    tam={44}
                  />
                  <div className="min-w-0">
                    <p className="text-sm">
                      <Link href={`/u/${c.autor.id}`} className="font-bold text-slate-800 hover:underline">
                        {c.autor.nombres} {c.autor.apellidos}
                      </Link>
                      <span className="text-slate-500"> calificó a </span>
                      <Link
                        href={`/u/${c.destinatario.id}`}
                        className="font-bold text-slate-800 hover:underline"
                      >
                        {c.destinatario.nombres} {c.destinatario.apellidos}
                      </Link>
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Estrellas valor={c.estrellas} />
                      <span
                        className={`chip ${
                          c.papel === 'solicitante'
                            ? 'border-cielo-300 bg-cielo-50 text-cielo-700'
                            : 'border-menta-300 bg-menta-50 text-menta-700'
                        }`}
                      >
                        {c.papel === 'solicitante' ? 'Cliente → Proveedor' : 'Proveedor → Cliente'}
                      </span>
                      {c.oculta && (
                        <span className="chip border-rose-200 bg-rose-50 text-rose-700">Oculta</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {c.trabajo.necesidad.titulo} · {fechaHora(c.createdAt)}
                    </p>
                  </div>
                </div>

                <OcultarCalificacion id={c.id} oculta={c.oculta} />
              </div>

              {c.comentario && (
                <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm whitespace-pre-line text-slate-700">
                  {c.comentario}
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      <Paginacion pagina={pagina} paginas={paginas} base="/admin/calificaciones" params={{ filtro }} />
    </div>
  )
}
