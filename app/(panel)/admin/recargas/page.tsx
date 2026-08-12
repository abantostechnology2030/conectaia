import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Encabezado } from '@/components/Encabezado'
import { Vacio } from '@/components/Vacio'
import { Chip } from '@/components/Chip'
import { Avatar } from '@/components/Avatar'
import { Paginacion } from '@/components/Paginacion'
import { RECARGA } from '@/lib/estados'
import { fechaHora, soles } from '@/lib/fechas'
import ResolverRecarga from './ResolverRecarga'

export const dynamic = 'force-dynamic'

const POR_PAGINA = 15

const FILTROS = [
  { id: 'pendiente', label: 'Pendientes' },
  { id: 'aprobada', label: 'Aprobadas' },
  { id: 'rechazada', label: 'Rechazadas' },
  { id: '', label: 'Todas' },
]

export default async function AdminRecargas({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; p?: string }>
}) {
  const sp = await searchParams
  const estado = sp.estado ?? 'pendiente'

  const donde = estado ? { estado } : {}
  const total = await prisma.recarga.count({ where: donde })
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA))
  const pagina = Math.min(Math.max(1, Number(sp.p) || 1), paginas)

  const recargas = await prisma.recarga.findMany({
    where: donde,
    include: {
      usuario: { select: { id: true, nombres: true, apellidos: true, fotoUrl: true, creditos: true } },
      paquete: { select: { nombre: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip: (pagina - 1) * POR_PAGINA,
    take: POR_PAGINA,
  })

  return (
    <div className="space-y-6">
      <Encabezado titulo="Recargas" subtitulo={`${total} solicitud(es)`} icono="creditos" />

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <Link
            key={f.id}
            href={f.id ? `/admin/recargas?estado=${f.id}` : '/admin/recargas?estado='}
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

      {recargas.length === 0 ? (
        <Vacio
          emoji="💳"
          titulo={estado === 'pendiente' ? 'No hay recargas pendientes' : 'No hay recargas con ese filtro'}
          mensaje={estado === 'pendiente' ? 'Todo revisado. Buen trabajo.' : undefined}
        />
      ) : (
        <div className="space-y-4">
          {recargas.map((r) => {
            const nombre = `${r.usuario.nombres} ${r.usuario.apellidos}`.trim()
            return (
              <article key={r.id} className="tarjeta">
                <div className="grid gap-4 sm:grid-cols-3">
                  {/* Comprobante */}
                  <a href={r.comprobante} target="_blank" rel="noopener noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.comprobante}
                      alt="Comprobante de pago"
                      className="h-48 w-full rounded-xl border border-slate-200 object-contain"
                    />
                    <span className="mt-1 block text-center text-xs text-marca-600 hover:underline">
                      Abrir en tamaño completo
                    </span>
                  </a>

                  <div className="sm:col-span-2">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={r.usuario.fotoUrl} nombre={nombre} tam={44} />
                        <div>
                          <Link
                            href={`/u/${r.usuario.id}`}
                            className="font-bold text-slate-800 hover:underline"
                          >
                            {nombre}
                          </Link>
                          <p className="text-sm text-slate-500">
                            Saldo actual: {r.usuario.creditos} crédito(s)
                          </p>
                        </div>
                      </div>
                      <Chip {...RECARGA[r.estado]} />
                    </div>

                    <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-400">Paquete</dt>
                        <dd className="font-bold text-slate-800">
                          {r.paquete.nombre} · {r.creditos} créditos
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-400">Monto</dt>
                        <dd className="text-xl font-extrabold text-marca-700">{soles(r.monto)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-400">N.º de operación</dt>
                        <dd className="font-semibold text-slate-700">{r.operacion ?? '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-400">Solicitada</dt>
                        <dd className="font-semibold text-slate-700">{fechaHora(r.createdAt)}</dd>
                      </div>
                    </dl>

                    <div className="mt-4 border-t border-slate-100 pt-4">
                      {r.estado === 'pendiente' ? (
                        <ResolverRecarga
                          id={r.id}
                          usuario={nombre}
                          creditos={r.creditos}
                          monto={r.monto}
                        />
                      ) : (
                        <p className="text-sm text-slate-600">
                          Resuelta {fechaHora(r.resueltoAt)}
                          {r.notaAdmin ? ` · ${r.notaAdmin}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <Paginacion pagina={pagina} paginas={paginas} base="/admin/recargas" params={{ estado }} />
    </div>
  )
}
