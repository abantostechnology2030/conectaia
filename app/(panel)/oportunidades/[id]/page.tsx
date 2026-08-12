import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { Encabezado } from '@/components/Encabezado'
import { ChipMatch } from '@/components/Chip'
import { Icono } from '@/components/Icono'
import { Avatar } from '@/components/Avatar'
import { Estrellas } from '@/components/Estrellas'
import { DatosContacto } from '@/components/DatosContacto'
import { nivelMatch, puntuar } from '@/lib/matching'
import { reputacionDe } from '@/lib/reputacion'
import { contactoDe } from '@/lib/contacto'
import { getValor, aNumero } from '@/lib/config'
import { cuando } from '@/lib/urgencia'
import { soles, fecha, hace, antiguedad } from '@/lib/fechas'
import AccionesOportunidad from './AccionesOportunidad'
import ServicioCompatible from './ServicioCompatible'

export const dynamic = 'force-dynamic'

/**
 * Ficha de una coincidencia, leída desde el extremo que le toque a quien mira.
 *
 * Una fila de `Match` une una necesidad y un servicio, y los dos dueños tienen
 * derecho a verla:
 *
 *   · el dueño del SERVICIO   -> "la necesidad de otro que encaja conmigo"
 *   · el dueño de la NECESIDAD -> "el profesional que encaja con lo que pedí"
 *
 * Es la misma ruta a propósito: es la misma coincidencia. Antes solo existía la
 * primera vista, y quien buscaba un servicio acababa en la ficha pública del
 * profesional, sin ninguna acción posible.
 *
 * Las dos muestran el desglose del puntaje, porque un "94%" sin explicación no
 * ayuda a decidir; ver que el 20 de ubicación entró completo y que el precio
 * encaja sí.
 */
export default async function Oportunidad({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const usuarioId = Number(session!.user.id)

  // Quién mira decide qué se pinta. Se resuelve antes de cargar nada pesado.
  const dueños = await prisma.match.findUnique({
    where: { id: Number(id) },
    select: { necesidad: { select: { usuarioId: true } }, servicio: { select: { usuarioId: true } } },
  })
  if (!dueños) notFound()

  if (dueños.servicio.usuarioId !== usuarioId) {
    if (dueños.necesidad.usuarioId !== usuarioId) notFound()
    // Se marca aquí también: hasta ahora, un clic desde "servicios para mí" no
    // contaba como coincidencia consultada y la métrica del PDR §40 se quedaba
    // corta por ese lado.
    await marcarVista(Number(id))
    return <ServicioCompatible matchId={Number(id)} usuarioId={usuarioId} />
  }

  const match = await prisma.match.findUnique({
    where: { id: Number(id) },
    include: {
      necesidad: {
        include: {
          categoria: true,
          subcategoria: true,
          fotos: { orderBy: { orden: 'asc' } },
          usuario: {
            select: {
              id: true,
              nombres: true,
              apellidos: true,
              fotoUrl: true,
              ciudad: true,
              descripcion: true,
              createdAt: true,
            },
          },
        },
      },
      servicio: true,
    },
  })

  if (!match) notFound()

  // Se anota que la coincidencia fue consultada (PDR §40).
  await marcarVista(match.id)

  const [yo, costo, reputacion, contacto, postulacion] = await Promise.all([
    prisma.usuario.findUnique({ where: { id: usuarioId }, select: { creditos: true } }),
    getValor('costo_desbloqueo').then((v) => aNumero(v, 1)),
    reputacionDe(match.necesidad.usuarioId),
    contactoDe(usuarioId, match.necesidad.usuarioId),
    prisma.postulacion.findUnique({
      where: { necesidadId_usuarioId: { necesidadId: match.necesidadId, usuarioId } },
      select: { id: true, estado: true },
    }),
  ])

  const detalle = puntuar(
    { ...match.necesidad, precioOfrecido: match.necesidad.precioOfrecido },
    { ...match.servicio, precioDesde: match.servicio.precioDesde },
  )

  const autor = match.necesidad.usuario
  const nombreAutor = `${autor.nombres} ${autor.apellidos}`.trim()
  const nivel = nivelMatch(match.puntaje)

  return (
    <div className="space-y-6">
      <Encabezado
        titulo="Oportunidad"
        subtitulo={`Publicada ${hace(match.necesidad.publicadaAt ?? match.necesidad.createdAt)}`}
        icono="match"
      >
        <Link href="/oportunidades" className="btn-secundario">
          Volver
        </Link>
      </Encabezado>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <article className="tarjeta">
            <div className="flex flex-wrap items-center gap-2">
              <ChipMatch puntaje={match.puntaje} clase={nivel.clase} />
              <span className="chip border-slate-200 bg-slate-50 text-slate-600">
                {match.necesidad.categoria.icono} {match.necesidad.categoria.nombre}
              </span>
              {(match.necesidad.subcategoria || match.necesidad.subcategoriaOtra) && (
                <span className="chip border-slate-200 bg-slate-50 text-slate-600">
                  {match.necesidad.subcategoria?.nombre ?? match.necesidad.subcategoriaOtra}
                </span>
              )}
            </div>

            <h2 className="mt-3 text-xl font-extrabold text-slate-800">{match.necesidad.titulo}</h2>
            <p className="mt-2 whitespace-pre-line text-slate-700">{match.necesidad.descripcion}</p>

            {match.necesidad.fotos.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {match.necesidad.fotos.map((f) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={f.id} src={f.url} alt="" className="h-32 w-full rounded-xl object-cover" />
                ))}
              </div>
            )}

            <dl className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
              <Dato icono="creditos" etiqueta="Presupuesto" valor={soles(match.necesidad.precioOfrecido)} />
              <Dato
                icono="ubicacion"
                etiqueta="Ubicación aproximada"
                valor={[match.necesidad.ciudad, match.necesidad.distrito].filter(Boolean).join(' · ')}
              />
              {(() => {
                const c = cuando(
                  match.necesidad.urgencia,
                  match.necesidad.fechaDeseada ? fecha(match.necesidad.fechaDeseada) : null,
                )
                return c && <Dato icono="reloj" etiqueta={c.etiqueta} valor={c.valor} />
              })()}
              {match.necesidad.horario && (
                <Dato icono="reloj" etiqueta="Horario" valor={match.necesidad.horario} />
              )}
            </dl>

            {match.necesidad.observaciones && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-bold text-slate-700">Observaciones</h3>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-600">
                  {match.necesidad.observaciones}
                </p>
              </div>
            )}
          </article>

          {/* Qué decides hacer */}
          <section className="tarjeta">
            <h2 className="font-bold text-slate-700">¿Qué quieres hacer?</h2>
            <div className="mt-3">
              <AccionesOportunidad
                matchId={match.id}
                necesidadId={match.necesidadId}
                necesidadTitulo={match.necesidad.titulo}
                servicioId={match.servicioId}
                precioSugerido={match.servicio.precioDesde}
                creditos={yo?.creditos ?? 0}
                costo={costo}
                yaPostulado={!!postulacion}
                yaContactado={contacto.visible}
              />
            </div>
          </section>

          {/* Por qué encaja */}
          <section className="tarjeta">
            <h2 className="font-bold text-slate-700">Por qué te lo mostramos</h2>
            <p className="mt-1 text-sm text-slate-500">
              Compatibilidad con tu servicio &laquo;{match.servicio.nombre}&raquo;.
            </p>
            <ul className="mt-4 space-y-2">
              {detalle.factores.map((f) => (
                <li key={f.nombre}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-700">{f.nombre}</span>
                    <span className="text-slate-500">
                      {f.puntos.toFixed(0)} / {f.maximo}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-marca-500"
                      style={{ width: `${(f.puntos / f.maximo) * 100}%` }}
                    />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{f.nota}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-4">
          {/* Quién publicó */}
          <div className="tarjeta">
            <h2 className="font-bold text-slate-700">Quién lo publicó</h2>
            <div className="mt-3 flex items-center gap-3">
              <Avatar src={autor.fotoUrl} nombre={nombreAutor} tam={52} />
              <div className="min-w-0">
                {/* Con la vuelta puesta: quien va a ver el perfil está
                    decidiendo si postularse o pagar por contactar, y tiene que
                    poder volver a la coincidencia sin perderla. */}
                <Link
                  href={`/u/${autor.id}?volver=${encodeURIComponent(`/oportunidades/${match.id}`)}`}
                  className="font-bold text-slate-800 hover:underline"
                >
                  {nombreAutor}
                </Link>
                <p className="text-sm text-slate-500">{autor.ciudad}</p>
              </div>
            </div>

            <div className="mt-3 space-y-1.5 text-sm">
              <Estrellas valor={reputacion.promedio} total={reputacion.total} />
              <p className="text-slate-500">
                {reputacion.trabajosContratados} trabajo(s) contratados
              </p>
              <p className="text-slate-400">Miembro desde {antiguedad(autor.createdAt)}</p>
            </div>

            {autor.descripcion && (
              <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">
                {autor.descripcion}
              </p>
            )}
          </div>

          <DatosContacto
            visible={contacto.visible}
            datos={contacto.datos}
            nombre={autor.nombres}
            aviso="Se desbloquean si contactas ahora (1 crédito) o si esta persona acepta tu oferta (en ese caso paga ella)."
          />
        </aside>
      </div>
    </div>
  )
}

/**
 * Deja constancia de que la coincidencia se consultó (métrica del PDR §40).
 * Solo la primera vez: lo que se cuenta es que llegó a mirarse, no cuántas
 * veces se recargó la página.
 */
async function marcarVista(matchId: number) {
  await prisma.match.updateMany({
    where: { id: matchId, vistoAt: null },
    data: { vistoAt: new Date() },
  })
}

function Dato({
  icono,
  etiqueta,
  valor,
}: {
  icono: 'creditos' | 'ubicacion' | 'reloj'
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
