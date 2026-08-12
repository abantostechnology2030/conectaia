import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { exigirLado } from '@/lib/modos'
import { Encabezado } from '@/components/Encabezado'
import { Vacio } from '@/components/Vacio'
import { Chip } from '@/components/Chip'
import { Icono } from '@/components/Icono'
import { SERVICIO } from '@/lib/estados'
import { soles } from '@/lib/fechas'

export const dynamic = 'force-dynamic'

export default async function MisServicios() {
  // Este lado del marketplace tiene que estar activado (ver lib/modos.ts).
  await exigirLado('ofrezco')

  const session = await auth()
  const usuarioId = Number(session!.user.id)

  const servicios = await prisma.servicio.findMany({
    where: { usuarioId },
    include: {
      categoria: true,
      fotos: { take: 1, orderBy: { orden: 'asc' } },
      _count: { select: { coincidencias: true, postulaciones: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <Encabezado
        titulo="Ofrezco un servicio"
        subtitulo="Lo que sabes hacer y puedes ofrecer a otros"
        icono="ofrezco"
      >
        <Link href="/servicios/nuevo" className="btn-menta">
          <Icono nombre="mas" className="h-4 w-4" />
          Publicar servicio
        </Link>
      </Encabezado>

      {servicios.length === 0 ? (
        <Vacio
          emoji="🛠️"
          titulo="Todavía no ofreces ningún servicio"
          mensaje="Publica lo que sabes hacer y te avisaremos cuando alguien lo necesite."
          accion={{ href: '/servicios/nuevo', label: 'Publicar mi primer servicio' }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {servicios.map((s) => (
            <Link key={s.id} href={`/servicios/${s.id}`} className="tarjeta flex flex-col">
              {s.fotos[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.fotos[0].url} alt="" className="mb-3 h-36 w-full rounded-xl object-cover" />
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Chip {...SERVICIO[s.estado]} />
                <span className="chip border-slate-200 bg-slate-50 text-slate-600">
                  {s.categoria.icono} {s.categoria.nombre}
                </span>
              </div>

              <h2 className="mt-2 font-bold text-slate-800">{s.nombre}</h2>
              <p className="lineas-2 mt-1 flex-1 text-sm text-slate-600">{s.descripcion}</p>

              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
                <span className="font-extrabold text-marca-700">
                  Desde {soles(s.precioDesde, '—')}
                </span>
                {s.estado === 'publicado' && s._count.coincidencias > 0 && (
                  <span className="chip border-durazno-300 bg-durazno-50 text-durazno-700">
                    🎯 {s._count.coincidencias} oportunidad(es)
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {servicios.some((s) => s.estado === 'pausado') && (
        <p className="rounded-xl border border-sol-300 bg-sol-50 px-4 py-3 text-sm text-sol-700">
          Tienes servicios pausados: no reciben oportunidades nuevas, pero conservan su historial.
          Puedes reactivarlos cuando quieras.
        </p>
      )}
    </div>
  )
}
