import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { exigirLado } from '@/lib/modos'
import { Encabezado } from '@/components/Encabezado'
import { Chip, ChipMatch } from '@/components/Chip'
import { Icono } from '@/components/Icono'
import { AvisoRevision } from '@/components/AvisoRevision'
import { SERVICIO, POSTULACION } from '@/lib/estados'
import { soles, hace } from '@/lib/fechas'
import { nivelMatch } from '@/lib/matching'
import AccionesServicio from './AccionesServicio'

export const dynamic = 'force-dynamic'

export default async function DetalleServicio({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // Este lado del marketplace tiene que estar activado (ver lib/modos.ts).
  await exigirLado('ofrezco')

  const session = await auth()

  const servicio = await prisma.servicio.findUnique({
    where: { id: Number(id) },
    include: {
      categoria: true,
      subcategoria: true,
      fotos: { orderBy: { orden: 'asc' } },
      postulaciones: {
        include: { necesidad: { select: { id: true, titulo: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      coincidencias: {
        where: { necesidad: { estado: 'publicada' } },
        include: { necesidad: { include: { categoria: true } } },
        orderBy: { puntaje: 'desc' },
        take: 6,
      },
    },
  })

  if (!servicio || servicio.usuarioId !== Number(session!.user.id)) notFound()

  return (
    <div className="space-y-6">
      <Encabezado titulo={servicio.nombre} subtitulo={`Creado ${hace(servicio.createdAt)}`} icono="ofrezco">
        <Link href="/servicios" className="btn-secundario">
          Volver
        </Link>
      </Encabezado>

      <AvisoRevision estado={servicio.estado} motivo={servicio.motivoRechazo} que="servicio" />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <article className="tarjeta-suave border-menta-200 bg-menta-50">
            <div className="flex flex-wrap items-center gap-2">
              <Chip {...SERVICIO[servicio.estado]} />
              <span className="chip border-slate-200 bg-white text-slate-600">
                {servicio.categoria.icono} {servicio.categoria.nombre}
              </span>
              {(servicio.subcategoria || servicio.subcategoriaOtra) && (
                <span className="chip border-slate-200 bg-white text-slate-600">
                  {servicio.subcategoria?.nombre ?? servicio.subcategoriaOtra}
                </span>
              )}
            </div>

            <p className="mt-4 whitespace-pre-line text-slate-700">{servicio.descripcion}</p>

            {servicio.fotos.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {servicio.fotos.map((f) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={f.id} src={f.url} alt="" className="h-32 w-full rounded-xl object-cover" />
                ))}
              </div>
            )}

            <dl className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
              <Dato icono="creditos" etiqueta="Precio desde" valor={soles(servicio.precioDesde, '—')} />
              <Dato
                icono="ubicacion"
                etiqueta="Zona"
                valor={servicio.zona || servicio.ciudad}
              />
              {servicio.experiencia && (
                <Dato icono="trabajo" etiqueta="Experiencia" valor={servicio.experiencia} />
              )}
              {servicio.disponibilidad && (
                <Dato icono="reloj" etiqueta="Disponibilidad" valor={servicio.disponibilidad} />
              )}
            </dl>

            {servicio.observaciones && (
              <div className="mt-4 rounded-xl border border-menta-200 bg-white p-4">
                <h3 className="text-sm font-bold text-slate-700">Observaciones</h3>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{servicio.observaciones}</p>
              </div>
            )}
          </article>

          {/* Oportunidades detectadas para este servicio */}
          <section>
            <h2 className="mb-1 text-lg font-extrabold text-slate-800">Oportunidades para este servicio</h2>
            <p className="mb-3 text-sm text-slate-500">
              Necesidades publicadas que encajan con lo que ofreces.
            </p>

            {servicio.estado !== 'publicado' ? (
              <p className="rounded-xl border border-sol-300 bg-sol-50 px-4 py-3 text-sm text-sol-700">
                Este servicio no está publicado, así que no recibe oportunidades. Publícalo para
                empezar a recibirlas.
              </p>
            ) : servicio.coincidencias.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
                Todavía no hay necesidades compatibles. Te avisaremos en cuanto aparezca alguna.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {servicio.coincidencias.map((m) => (
                  <Link key={m.id} href={`/oportunidades/${m.id}`} className="tarjeta">
                    <ChipMatch puntaje={m.puntaje} clase={nivelMatch(m.puntaje).clase} />
                    <h3 className="mt-2 font-bold text-slate-800">{m.necesidad.titulo}</h3>
                    <p className="lineas-2 mt-1 text-sm text-slate-600">{m.necesidad.descripcion}</p>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Icono nombre="ubicacion" className="h-4 w-4" />
                        {m.necesidad.ciudad}
                      </span>
                      <span className="font-extrabold text-marca-700">
                        {soles(m.necesidad.precioOfrecido)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Postulaciones hechas con este servicio */}
          {servicio.postulaciones.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-extrabold text-slate-800">
                Postulaciones con este servicio
              </h2>
              <div className="tarjeta scroll-x">
                <table className="tabla">
                  <thead>
                    <tr>
                      <th>Necesidad</th>
                      <th>Precio ofertado</th>
                      <th>Estado</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {servicio.postulaciones.map((p) => (
                      <tr key={p.id}>
                        <td className="font-semibold">{p.necesidad.titulo}</td>
                        <td>{soles(p.precio)}</td>
                        <td>
                          <Chip {...POSTULACION[p.estado]} />
                        </td>
                        <td className="text-slate-500">{hace(p.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <div className="tarjeta">
            <h2 className="font-bold text-slate-700">Acciones</h2>
            <div className="mt-3">
              <AccionesServicio
                id={servicio.id}
                nombre={servicio.nombre}
                estado={servicio.estado}
                tienePostulaciones={servicio.postulaciones.length > 0}
              />
            </div>
          </div>

          <div className="tarjeta">
            <h2 className="flex items-center gap-2 font-bold text-slate-700">
              <Icono nombre="candado" className="h-5 w-5 text-slate-400" />
              Tus datos están protegidos
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Quien vea tu servicio no puede ver tu teléfono ni tu correo. Se comparten solo cuando
              aceptan tu oferta o cuando tú desbloqueas un contacto.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Dato({
  icono,
  etiqueta,
  valor,
}: {
  icono: 'creditos' | 'ubicacion' | 'reloj' | 'trabajo'
  etiqueta: string
  valor: string
}) {
  return (
    <div className="flex items-start gap-2">
      <Icono nombre={icono} className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{etiqueta}</dt>
        <dd className="font-bold text-slate-800">{valor || '—'}</dd>
      </div>
    </div>
  )
}
