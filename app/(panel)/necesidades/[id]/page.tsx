import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { exigirLado } from '@/lib/modos'
import { Encabezado } from '@/components/Encabezado'
import { Chip, ChipMatch } from '@/components/Chip'
import { Icono } from '@/components/Icono'
import { Estrellas } from '@/components/Estrellas'
import { Avatar } from '@/components/Avatar'
import { AvisoRevision } from '@/components/AvisoRevision'
import { NECESIDAD } from '@/lib/estados'
import { cuando } from '@/lib/urgencia'
import { soles, fecha, hace } from '@/lib/fechas'
import { reputacionDeVarios } from '@/lib/reputacion'
import { parejasDesbloqueadas } from '@/lib/contacto'
import { nivelMatch } from '@/lib/matching'
import { getValor, aNumero } from '@/lib/config'
import Ofertas, { type OfertaVista } from './Ofertas'
import AccionesNecesidad from './AccionesNecesidad'

export const dynamic = 'force-dynamic'

export default async function DetalleNecesidad({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // Este lado del marketplace tiene que estar activado (ver lib/modos.ts).
  await exigirLado('busco')

  const session = await auth()
  const usuarioId = Number(session!.user.id)

  const necesidad = await prisma.necesidad.findUnique({
    where: { id: Number(id) },
    include: {
      categoria: true,
      subcategoria: true,
      fotos: { orderBy: { orden: 'asc' } },
      trabajo: true,
      postulaciones: {
        include: {
          usuario: { select: { id: true, nombres: true, apellidos: true, fotoUrl: true, ciudad: true } },
          servicio: { select: { id: true, nombre: true } },
        },
        orderBy: [{ estado: 'asc' }, { precio: 'asc' }],
      },
    },
  })

  if (!necesidad || necesidad.usuarioId !== usuarioId) notFound()

  const [yo, costo] = await Promise.all([
    prisma.usuario.findUnique({ where: { id: usuarioId }, select: { creditos: true } }),
    getValor('costo_desbloqueo').then((v) => aNumero(v, 1)),
  ])

  // Reputación de todos los que ofertaron, en una sola consulta.
  const reps = await reputacionDeVarios(necesidad.postulaciones.map((p) => p.usuarioId))

  // Con quiénes YA hay contacto abierto. Hace falta para no mentir en el botón:
  // el cobro es por pareja, así que aceptar la oferta de alguien a quien ya se
  // desbloqueó no cuesta nada.
  const yaAbiertos = await parejasDesbloqueadas(
    usuarioId,
    necesidad.postulaciones.map((p) => p.usuarioId),
  )

  // Ojo: aquí se construye a mano lo que viaja al navegador. NO se hace un
  // spread del usuario, porque arrastraría celular, correo y dirección al
  // cliente y bastaría con mirar el HTML para saltarse el muro de créditos.
  const ofertas: OfertaVista[] = necesidad.postulaciones
    .filter((p) => p.estado !== 'retirada')
    .map((p) => {
      const r = reps.get(p.usuarioId)
      return {
        id: p.id,
        precio: p.precio,
        comentario: p.comentario,
        tiempoEstimado: p.tiempoEstimado,
        disponibilidad: p.disponibilidad,
        fechaPropuesta: p.fechaPropuesta ? p.fechaPropuesta.toISOString() : null,
        estado: p.estado,
        autor: {
          id: p.usuario.id,
          nombre: `${p.usuario.nombres} ${p.usuario.apellidos}`.trim(),
          fotoUrl: p.usuario.fotoUrl,
          ciudad: p.usuario.ciudad,
          reputacion: r?.promedio ?? 0,
          calificaciones: r?.total ?? 0,
          trabajosRealizados: r?.trabajosRealizados ?? 0,
        },
        servicio: p.servicio ? { id: p.servicio.id, nombre: p.servicio.nombre } : null,
        yaDesbloqueado: yaAbiertos.has(p.usuarioId),
      }
    })

  // Servicios compatibles (PDR §21): los profesionales que ofrecen esto y a
  // quienes todavía no se les ha visto. Es el sentido "servicios para mí".
  const compatibles =
    necesidad.estado === 'publicada'
      ? await prisma.match.findMany({
          where: { necesidadId: necesidad.id },
          include: {
            servicio: {
              include: {
                usuario: { select: { id: true, nombres: true, apellidos: true, fotoUrl: true } },
                categoria: true,
              },
            },
          },
          orderBy: { puntaje: 'desc' },
          take: 6,
        })
      : []

  const repsServicios = await reputacionDeVarios(compatibles.map((m) => m.servicio.usuarioId))

  // Se ocultan los que ya se postularon: aparecen arriba, en las ofertas.
  const yaPostularon = new Set(necesidad.postulaciones.map((p) => p.usuarioId))
  const serviciosCompatibles = compatibles.filter((m) => !yaPostularon.has(m.servicio.usuarioId))

  return (
    <div className="space-y-6">
      <Encabezado titulo={necesidad.titulo} subtitulo={`Publicada ${hace(necesidad.publicadaAt ?? necesidad.createdAt)}`} icono="busco">
        <Link href="/necesidades" className="btn-secundario">
          Volver
        </Link>
      </Encabezado>

      <AvisoRevision estado={necesidad.estado} motivo={necesidad.motivoRechazo} que="necesidad" />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Ficha */}
        <div className="space-y-4 lg:col-span-2">
          <article className="tarjeta">
            <div className="flex flex-wrap items-center gap-2">
              <Chip {...NECESIDAD[necesidad.estado]} />
              <span className="chip border-slate-200 bg-slate-50 text-slate-600">
                {necesidad.categoria.icono} {necesidad.categoria.nombre}
              </span>
              {(necesidad.subcategoria || necesidad.subcategoriaOtra) && (
                <span className="chip border-slate-200 bg-slate-50 text-slate-600">
                  {necesidad.subcategoria?.nombre ?? necesidad.subcategoriaOtra}
                </span>
              )}
            </div>

            <p className="mt-4 whitespace-pre-line text-slate-700">{necesidad.descripcion}</p>

            {necesidad.fotos.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {necesidad.fotos.map((f) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={f.id} src={f.url} alt="" className="h-32 w-full rounded-xl object-cover" />
                ))}
              </div>
            )}

            <dl className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
              <Dato icono="creditos" etiqueta="Presupuesto" valor={soles(necesidad.precioOfrecido)} />
              <Dato
                icono="ubicacion"
                etiqueta="Ubicación"
                valor={[necesidad.ciudad, necesidad.distrito].filter(Boolean).join(' · ')}
              />
              {(() => {
                const c = cuando(
                  necesidad.urgencia,
                  necesidad.fechaDeseada ? fecha(necesidad.fechaDeseada) : null,
                )
                return c && <Dato icono="reloj" etiqueta={c.etiqueta} valor={c.valor} />
              })()}
              {necesidad.horario && <Dato icono="reloj" etiqueta="Horario" valor={necesidad.horario} />}
            </dl>

            {necesidad.observaciones && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-bold text-slate-700">Observaciones</h3>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{necesidad.observaciones}</p>
              </div>
            )}
          </article>

          {/* Ofertas recibidas */}
          <section>
            <h2 className="mb-3 text-lg font-extrabold text-slate-800">
              Ofertas recibidas{' '}
              <span className="text-sm font-semibold text-slate-500">({ofertas.length})</span>
            </h2>
            <Ofertas
              necesidadId={necesidad.id}
              necesidadTitulo={necesidad.titulo}
              ofertas={ofertas}
              creditos={yo?.creditos ?? 0}
              costo={costo}
              puedeAceptar={necesidad.estado === 'publicada'}
            />
          </section>

          {/* Servicios compatibles */}
          {serviciosCompatibles.length > 0 && (
            <section>
              <h2 className="mb-1 text-lg font-extrabold text-slate-800">Servicios compatibles</h2>
              <p className="mb-3 text-sm text-slate-500">
                Encontramos profesionales que ofrecen este servicio. Puedes esperar a que se postulen
                —no cuesta nada— o abrir tú el contacto desde su ficha.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {serviciosCompatibles.map((m) => {
                  const r = repsServicios.get(m.servicio.usuarioId)
                  const nombre = `${m.servicio.usuario.nombres} ${m.servicio.usuario.apellidos}`.trim()
                  return (
                    // A la ficha de la COINCIDENCIA, no a la pública del
                    // servicio: es donde está el desglose del puntaje y el
                    // botón para contactar. Este era el segundo camino que
                    // seguía llevando al callejón sin salida.
                    <Link key={m.id} href={`/oportunidades/${m.id}`} className="tarjeta">
                      <ChipMatch puntaje={m.puntaje} clase={nivelMatch(m.puntaje).clase} />
                      <div className="mt-3 flex items-center gap-3">
                        <Avatar src={m.servicio.usuario.fotoUrl} nombre={nombre} tam={40} />
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-800">{nombre}</p>
                          <p className="truncate text-sm text-slate-600">{m.servicio.nombre}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
                        <Estrellas valor={r?.promedio ?? 0} total={r?.total ?? 0} />
                        <span className="font-bold text-marca-700">
                          Desde {soles(m.servicio.precioDesde, '—')}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}
        </div>

        {/* Columna lateral */}
        <aside className="space-y-4">
          <div className="tarjeta">
            <h2 className="font-bold text-slate-700">Acciones</h2>
            <div className="mt-3">
              <AccionesNecesidad
                id={necesidad.id}
                titulo={necesidad.titulo}
                estado={necesidad.estado}
                tienePostulaciones={necesidad.postulaciones.length > 0}
              />
            </div>
          </div>

          {necesidad.trabajo && (
            <div className="tarjeta border-menta-300 bg-menta-50">
              <h2 className="font-bold text-menta-800">Trabajo en marcha</h2>
              <p className="mt-1 text-sm text-menta-700">
                Ya seleccionaste una oferta. Desde el trabajo puedes ver el contacto, marcarlo como
                finalizado y calificar.
              </p>
              <Link href={`/trabajos/${necesidad.trabajo.id}`} className="btn-menta mt-3 w-full">
                Ver el trabajo
              </Link>
            </div>
          )}

          <div className="tarjeta">
            <h2 className="flex items-center gap-2 font-bold text-slate-700">
              <Icono nombre="candado" className="h-5 w-5 text-slate-400" />
              Tus datos están protegidos
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Tu teléfono, correo y dirección exacta no se muestran a nadie. Se comparten únicamente
              cuando aceptas una oferta o alguien desbloquea el contacto contigo.
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
