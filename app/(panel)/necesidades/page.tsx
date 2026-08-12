import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { exigirLado } from '@/lib/modos'
import { Encabezado } from '@/components/Encabezado'
import { Vacio } from '@/components/Vacio'
import { Chip } from '@/components/Chip'
import { Icono } from '@/components/Icono'
import { NECESIDAD } from '@/lib/estados'
import { soles, hace } from '@/lib/fechas'

export const dynamic = 'force-dynamic'

const FILTROS = [
  { id: '', label: 'Todas' },
  { id: 'publicada', label: 'Publicadas' },
  { id: 'borrador', label: 'Borradores' },
  { id: 'en_curso', label: 'En curso' },
  { id: 'finalizada', label: 'Finalizadas' },
]

export default async function MisNecesidades({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>
}) {
  const { estado = '' } = await searchParams
  // Este lado del marketplace tiene que estar activado (ver lib/modos.ts).
  await exigirLado('busco')

  const session = await auth()
  const usuarioId = Number(session!.user.id)

  // "En curso" agrupa los dos estados intermedios: para el usuario es una sola
  // situación ("ya elegí a alguien y el trabajo está andando").
  const filtro =
    estado === 'en_curso'
      ? { estado: { in: ['oferta_seleccionada', 'en_proceso'] } }
      : estado
        ? { estado }
        : {}

  const necesidades = await prisma.necesidad.findMany({
    where: { usuarioId, ...filtro },
    include: {
      categoria: true,
      fotos: { take: 1, orderBy: { orden: 'asc' } },
      _count: { select: { postulaciones: { where: { estado: 'enviada' } } } },
    },
    orderBy: [{ createdAt: 'desc' }],
  })

  return (
    <div className="space-y-6">
      <Encabezado
        titulo="Busco un servicio"
        subtitulo="Lo que necesitas que alguien haga por ti"
        icono="busco"
      >
        <Link href="/necesidades/nueva" className="btn-cielo">
          <Icono nombre="mas" className="h-4 w-4" />
          Publicar necesidad
        </Link>
      </Encabezado>

      <div className="scroll-x flex gap-2">
        {FILTROS.map((f) => (
          <Link
            key={f.id}
            href={f.id ? `/necesidades?estado=${f.id}` : '/necesidades'}
            className={`chip whitespace-nowrap ${
              estado === f.id
                ? 'border-cielo-500 bg-cielo-500 text-white'
                : 'border-slate-300 bg-white text-slate-600'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {necesidades.length === 0 ? (
        <Vacio
          emoji="🔎"
          titulo="Todavía no has publicado nada"
          mensaje="Cuenta lo que necesitas y recibe ofertas de personas que pueden hacerlo."
          accion={{ href: '/necesidades/nueva', label: 'Publicar mi primera necesidad' }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {necesidades.map((n) => (
            <Link key={n.id} href={`/necesidades/${n.id}`} className="tarjeta flex flex-col">
              {n.fotos[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={n.fotos[0].url}
                  alt=""
                  className="mb-3 h-36 w-full rounded-xl object-cover"
                />
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Chip {...NECESIDAD[n.estado]} />
                <span className="chip border-slate-200 bg-slate-50 text-slate-600">
                  {n.categoria.icono} {n.categoria.nombre}
                </span>
              </div>

              <h2 className="mt-2 font-bold text-slate-800">{n.titulo}</h2>
              <p className="lineas-2 mt-1 flex-1 text-sm text-slate-600">{n.descripcion}</p>

              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
                <span className="font-extrabold text-marca-700">{soles(n.precioOfrecido)}</span>
                {n._count.postulaciones > 0 ? (
                  <span className="chip border-durazno-300 bg-durazno-50 text-durazno-700">
                    {n._count.postulaciones} oferta(s) nueva(s)
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">{hace(n.publicadaAt ?? n.createdAt)}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
