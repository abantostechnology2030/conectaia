import Link from 'next/link'
import { notFound } from 'next/navigation'
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
import { soles, hace, antiguedad } from '@/lib/fechas'
import AccionesServicio from './AccionesServicio'

/**
 * La coincidencia vista desde el lado de quien NECESITA: un profesional que
 * encaja con mi necesidad.
 *
 * Es el espejo de la ficha de oportunidad del proveedor, y a propósito: el
 * puntaje se desglosa igual, el contacto se desbloquea igual y cuesta lo mismo.
 * Lo único que cambia es qué extremo del `Match` es mío.
 *
 * Antes esta tarjeta llevaba a la ficha pública del servicio, que no ofrecía
 * ninguna acción: se veían dos profesionales compatibles y no se podía hacer
 * nada con ellos.
 */
export default async function ServicioCompatible({
  matchId,
  usuarioId,
}: {
  matchId: number
  usuarioId: number
}) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      servicio: {
        include: {
          categoria: true,
          subcategoria: true,
          fotos: { orderBy: { orden: 'asc' } },
          // Campo a campo: hacer `spread` del usuario metería su celular y su
          // correo en el HTML, y bastaría con abrir las herramientas del
          // navegador para saltarse el muro de créditos (regla 5).
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
      necesidad: true,
    },
  })

  // Esta pantalla es la del lado de quien PIDE: solo el dueño de la necesidad
  // la ve. El dueño del servicio tiene la suya en la misma ruta.
  if (!match || match.necesidad.usuarioId !== usuarioId) notFound()

  const [yo, costo, reputacion, contacto] = await Promise.all([
    prisma.usuario.findUnique({ where: { id: usuarioId }, select: { creditos: true } }),
    getValor('costo_desbloqueo').then((v) => aNumero(v, 1)),
    reputacionDe(match.servicio.usuarioId),
    contactoDe(usuarioId, match.servicio.usuarioId),
  ])

  const detalle = puntuar(match.necesidad, match.servicio)

  const autor = match.servicio.usuario
  const nombreAutor = `${autor.nombres} ${autor.apellidos}`.trim()
  const nivel = nivelMatch(match.puntaje)
  const disponible = match.servicio.estado === 'publicado'

  return (
    <div className="space-y-6">
      <Encabezado
        titulo="Servicio compatible"
        subtitulo={`Publicado ${hace(match.servicio.publicadoAt ?? match.servicio.createdAt)}`}
        icono="match"
      >
        <Link href="/oportunidades?lado=servicios" className="btn-secundario">
          Volver
        </Link>
      </Encabezado>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <article className="tarjeta">
            <div className="flex flex-wrap items-center gap-2">
              <ChipMatch puntaje={match.puntaje} clase={nivel.clase} />
              <span className="chip border-slate-200 bg-slate-50 text-slate-600">
                {match.servicio.categoria.icono} {match.servicio.categoria.nombre}
              </span>
              {(match.servicio.subcategoria || match.servicio.subcategoriaOtra) && (
                <span className="chip border-slate-200 bg-slate-50 text-slate-600">
                  {match.servicio.subcategoria?.nombre ?? match.servicio.subcategoriaOtra}
                </span>
              )}
            </div>

            <h2 className="mt-3 text-xl font-extrabold text-slate-800">{match.servicio.nombre}</h2>
            <p className="mt-2 whitespace-pre-line text-slate-700">{match.servicio.descripcion}</p>

            {match.servicio.fotos.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {match.servicio.fotos.map((f) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={f.id} src={f.url} alt="" className="h-32 w-full rounded-xl object-cover" />
                ))}
              </div>
            )}

            <dl className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
              <Dato icono="creditos" etiqueta="Precio desde" valor={soles(match.servicio.precioDesde, '—')} />
              <Dato icono="ubicacion" etiqueta="Zona" valor={match.servicio.zona || match.servicio.ciudad} />
              {match.servicio.experiencia && (
                <Dato icono="trabajo" etiqueta="Experiencia" valor={match.servicio.experiencia} />
              )}
              {match.servicio.disponibilidad && (
                <Dato icono="reloj" etiqueta="Disponibilidad" valor={match.servicio.disponibilidad} />
              )}
            </dl>

            {match.servicio.observaciones && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-bold text-slate-700">Observaciones</h3>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-600">
                  {match.servicio.observaciones}
                </p>
              </div>
            )}
          </article>

          {/* Qué decides hacer */}
          <section className="tarjeta">
            <h2 className="font-bold text-slate-700">¿Qué quieres hacer?</h2>
            <p className="mt-1 text-sm text-slate-500">
              Para tu necesidad &laquo;{match.necesidad.titulo}&raquo;.
            </p>
            <div className="mt-3">
              {disponible ? (
                <AccionesServicio
                  matchId={match.id}
                  servicioNombre={match.servicio.nombre}
                  profesional={autor.nombres}
                  creditos={yo?.creditos ?? 0}
                  costo={costo}
                  yaContactado={contacto.visible}
                />
              ) : (
                <p className="rounded-xl border border-sol-300 bg-sol-50 px-4 py-3 text-sm text-sol-800">
                  {autor.nombres} pausó este servicio, así que por ahora no se puede contactar por
                  aquí. Te lo seguimos mostrando por si lo reactiva.
                </p>
              )}
            </div>
          </section>

          {/* Por qué encaja */}
          <section className="tarjeta">
            <h2 className="font-bold text-slate-700">Por qué te lo mostramos</h2>
            <p className="mt-1 text-sm text-slate-500">
              Compatibilidad con tu necesidad &laquo;{match.necesidad.titulo}&raquo;.
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
          {/* Quién lo ofrece */}
          <div className="tarjeta">
            <h2 className="font-bold text-slate-700">Quién lo ofrece</h2>
            <div className="mt-3 flex items-center gap-3">
              <Avatar src={autor.fotoUrl} nombre={nombreAutor} tam={52} />
              <div className="min-w-0">
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
              <p className="text-slate-500">{reputacion.trabajosRealizados} trabajo(s) realizados</p>
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
            aviso="Se desbloquean si contactas ahora (1 crédito) o si aceptas una oferta suya (en ese caso también pagas tú, pero solo cuando ya hay trato)."
          />
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
