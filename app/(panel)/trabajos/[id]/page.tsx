import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { Encabezado } from '@/components/Encabezado'
import { Chip } from '@/components/Chip'
import { Avatar } from '@/components/Avatar'
import { Estrellas } from '@/components/Estrellas'
import { DatosContacto } from '@/components/DatosContacto'
import { TRABAJO } from '@/lib/estados'
import { soles, fechaHora } from '@/lib/fechas'
import { contactoDe } from '@/lib/contacto'
import { reputacionDe } from '@/lib/reputacion'
import AccionesTrabajo from './AccionesTrabajo'

export const dynamic = 'force-dynamic'

export default async function DetalleTrabajo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const usuarioId = Number(session!.user.id)

  // Un identificador que no es un número se queda en 404, no en un error del
  // servidor: `Number('undefined')` es NaN y Prisma revienta con él.
  const trabajoId = Number(id)
  if (!Number.isInteger(trabajoId)) notFound()

  const trabajo = await prisma.trabajo.findUnique({
    where: { id: trabajoId },
    include: {
      necesidad: { include: { categoria: true } },
      postulacion: true,
      solicitante: { select: { id: true, nombres: true, apellidos: true, fotoUrl: true, ciudad: true } },
      proveedor: { select: { id: true, nombres: true, apellidos: true, fotoUrl: true, ciudad: true } },
      calificaciones: {
        include: { autor: { select: { id: true, nombres: true, apellidos: true, fotoUrl: true } } },
      },
    },
  })

  if (!trabajo) notFound()

  const soySolicitante = trabajo.solicitanteId === usuarioId
  const soyProveedor = trabajo.proveedorId === usuarioId
  if (!soySolicitante && !soyProveedor) notFound()

  const otra = soySolicitante ? trabajo.proveedor : trabajo.solicitante
  const nombreOtra = `${otra.nombres} ${otra.apellidos}`.trim()

  const [contacto, reputacion] = await Promise.all([
    contactoDe(usuarioId, otra.id),
    reputacionDe(otra.id),
  ])

  const miCalificacion = trabajo.calificaciones.find((c) => c.autorId === usuarioId)
  const suCalificacion = trabajo.calificaciones.find((c) => c.autorId === otra.id)

  return (
    <div className="space-y-6">
      <Encabezado titulo={trabajo.necesidad.titulo} subtitulo="Trabajo" icono="trabajo">
        <Link href="/trabajos" className="btn-secundario">
          Volver
        </Link>
      </Encabezado>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <article className="tarjeta">
            <div className="flex flex-wrap items-center gap-2">
              <Chip {...TRABAJO[trabajo.estado]} />
              <span
                className={`chip ${
                  soySolicitante
                    ? 'border-cielo-300 bg-cielo-50 text-cielo-700'
                    : 'border-menta-300 bg-menta-50 text-menta-700'
                }`}
              >
                {soySolicitante ? '🔎 Tú lo contrataste' : '🛠️ Tú lo realizas'}
              </span>
              <span className="chip border-slate-200 bg-slate-50 text-slate-600">
                {trabajo.necesidad.categoria.icono} {trabajo.necesidad.categoria.nombre}
              </span>
            </div>

            <p className="mt-4 whitespace-pre-line text-slate-700">{trabajo.necesidad.descripcion}</p>

            <dl className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Precio acordado
                </dt>
                <dd className="text-2xl font-extrabold text-marca-700">{soles(trabajo.precioAcordado)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Ubicación
                </dt>
                <dd className="font-bold text-slate-800">
                  {[trabajo.necesidad.ciudad, trabajo.necesidad.distrito].filter(Boolean).join(' · ')}
                </dd>
              </div>
              {trabajo.postulacion.tiempoEstimado && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Tiempo estimado
                  </dt>
                  <dd className="font-bold text-slate-800">{trabajo.postulacion.tiempoEstimado}</dd>
                </div>
              )}
              {trabajo.postulacion.disponibilidad && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Disponibilidad
                  </dt>
                  <dd className="font-bold text-slate-800">{trabajo.postulacion.disponibilidad}</dd>
                </div>
              )}
            </dl>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-bold text-slate-700">Lo que ofreció {otra.nombres}</h3>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-600">
                {trabajo.postulacion.comentario}
              </p>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              Contacto desbloqueado el {fechaHora(trabajo.createdAt)}.
            </p>
          </article>

          <section className="tarjeta">
            <h2 className="font-bold text-slate-700">Estado del trabajo</h2>
            <div className="mt-3">
              <AccionesTrabajo
                id={trabajo.id}
                titulo={trabajo.necesidad.titulo}
                estado={trabajo.estado}
                yaCalifique={!!miCalificacion}
                nombreOtra={otra.nombres}
              />
            </div>
          </section>

          {/* Calificaciones cruzadas */}
          {trabajo.calificaciones.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-extrabold text-slate-800">Calificaciones</h2>
              <div className="space-y-3">
                {[miCalificacion, suCalificacion].filter(Boolean).map((c) => (
                  <article key={c!.id} className="tarjeta">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={c!.autor.fotoUrl}
                        nombre={`${c!.autor.nombres} ${c!.autor.apellidos}`}
                        tam={40}
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800">
                          {c!.autorId === usuarioId
                            ? 'Tu calificación'
                            : `${c!.autor.nombres} ${c!.autor.apellidos}`.trim()}
                        </p>
                        <Estrellas valor={c!.estrellas} tam="sm" />
                      </div>
                    </div>
                    {c!.comentario && (
                      <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{c!.comentario}</p>
                    )}
                  </article>
                ))}
              </div>

              {trabajo.estado === 'finalizado' && !suCalificacion && (
                <p className="mt-3 text-sm text-slate-500">
                  {otra.nombres} todavía no ha calificado este trabajo.
                </p>
              )}
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <div className="tarjeta">
            <h2 className="font-bold text-slate-700">
              {soySolicitante ? 'Quién realiza el trabajo' : 'Quién lo contrató'}
            </h2>
            <div className="mt-3 flex items-center gap-3">
              <Avatar src={otra.fotoUrl} nombre={nombreOtra} tam={52} />
              <div className="min-w-0">
                <Link href={`/u/${otra.id}`} className="font-bold text-slate-800 hover:underline">
                  {nombreOtra}
                </Link>
                <p className="text-sm text-slate-500">{otra.ciudad}</p>
              </div>
            </div>
            <div className="mt-3 space-y-1 text-sm">
              <Estrellas valor={reputacion.promedio} total={reputacion.total} />
              <p className="text-slate-500">
                {soySolicitante
                  ? `${reputacion.trabajosRealizados} trabajo(s) realizados`
                  : `${reputacion.trabajosContratados} trabajo(s) contratados`}
              </p>
            </div>
          </div>

          <DatosContacto visible={contacto.visible} datos={contacto.datos} nombre={otra.nombres} />
        </aside>
      </div>
    </div>
  )
}
