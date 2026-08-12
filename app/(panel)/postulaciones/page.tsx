import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { exigirLado } from '@/lib/modos'
import { Encabezado } from '@/components/Encabezado'
import { Vacio } from '@/components/Vacio'
import { Chip } from '@/components/Chip'
import { Icono } from '@/components/Icono'
import { POSTULACION } from '@/lib/estados'
import { soles, hace } from '@/lib/fechas'
import RetirarOferta from './RetirarOferta'

export const dynamic = 'force-dynamic'

// Las ofertas que YO he enviado (PDR §36).
export default async function MisPostulaciones() {
  // Este lado del marketplace tiene que estar activado (ver lib/modos.ts).
  await exigirLado('ofrezco')

  const session = await auth()
  const usuarioId = Number(session!.user.id)

  const postulaciones = await prisma.postulacion.findMany({
    where: { usuarioId },
    include: {
      necesidad: { include: { categoria: true } },
      servicio: { select: { id: true, nombre: true } },
      trabajo: { select: { id: true } },
    },
    orderBy: [{ createdAt: 'desc' }],
  })

  return (
    <div className="space-y-6">
      <Encabezado
        titulo="Mis postulaciones"
        subtitulo="Las ofertas que has enviado"
        icono="oferta"
      />

      {postulaciones.length === 0 ? (
        <Vacio
          emoji="📤"
          titulo="Aún no te has postulado a nada"
          mensaje="Revisa tus oportunidades: ahí aparecen las necesidades que encajan con tus servicios."
          accion={{ href: '/oportunidades', label: 'Ver mis oportunidades' }}
        />
      ) : (
        <div className="space-y-4">
          {postulaciones.map((p) => (
            <article key={p.id} className="tarjeta">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip {...POSTULACION[p.estado]} />
                    <span className="chip border-slate-200 bg-slate-50 text-slate-600">
                      {p.necesidad.categoria.icono} {p.necesidad.categoria.nombre}
                    </span>
                  </div>
                  <h2 className="mt-2 font-bold text-slate-800">{p.necesidad.titulo}</h2>
                  <p className="lineas-2 mt-1 text-sm text-slate-600">{p.comentario}</p>
                </div>

                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Tu oferta</p>
                  <p className="text-2xl font-extrabold text-marca-700">{soles(p.precio)}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-sm">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Icono nombre="ubicacion" className="h-4 w-4" />
                    {p.necesidad.ciudad}
                  </span>
                  <span>Presupuesto: {soles(p.necesidad.precioOfrecido)}</span>
                  {p.servicio && <span>Con: {p.servicio.nombre}</span>}
                  <span>{hace(p.createdAt)}</span>
                </div>

                <div className="flex items-center gap-2">
                  {p.trabajo && (
                    <Link href={`/trabajos/${p.trabajo.id}`} className="btn-menta">
                      Ver el trabajo
                    </Link>
                  )}
                  {p.estado === 'enviada' && <RetirarOferta id={p.id} titulo={p.necesidad.titulo} />}
                </div>
              </div>

              {p.estado === 'enviada' && (
                <p className="mt-2 text-xs text-slate-400">
                  Esperando respuesta. Si aceptan tu oferta, el crédito lo paga quien la acepta: tú no
                  pagas nada.
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
