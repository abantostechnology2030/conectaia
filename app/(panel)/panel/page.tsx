import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { Stat } from '@/components/Stat'
import { Icono } from '@/components/Icono'
import { Chip, ChipMatch } from '@/components/Chip'
import { Estrellas } from '@/components/Estrellas'
import { NECESIDAD } from '@/lib/estados'
import { nivelMatch } from '@/lib/matching'
import { reputacionDe } from '@/lib/reputacion'
import { soles, hace } from '@/lib/fechas'
import { ICONO_NOTIFICACION } from '@/lib/notificaciones'
import { usuarioActual, puedeBuscar, puedeOfrecer, modoEfectivo } from '@/lib/modos'
import SelectorLado from './SelectorLado'

export const dynamic = 'force-dynamic'

// Inicio del usuario (PDR §34). Enseña solo el lado (o los lados) que tenga
// activado: a quien únicamente busca servicios, las tarjetas de oportunidades y
// postulaciones no le dicen nada.
//
// Es además la pantalla a la que vuelve quien intentó abrir una página del lado
// que tiene apagado (`?activar=`): aquí está el botón para pasarse a ese lado,
// así que se le deja justo delante de lo que le faltaba.
export default async function Panel({
  searchParams,
}: {
  searchParams: Promise<{ activar?: string }>
}) {
  const { activar } = await searchParams
  const session = await auth()
  const usuarioId = Number(session!.user.id)
  const nombre = (session!.user.name ?? '').split(' ')[0]

  const { modo } = await usuarioActual()
  const efectivo = modoEfectivo(modo)
  const busco = puedeBuscar(modo)
  const ofrezco = puedeOfrecer(modo)
  const pedido = activar === 'busco' || activar === 'ofrezco' ? activar : undefined

  const [
    yo,
    misNecesidades,
    misServicios,
    misPostulaciones,
    ofertasRecibidas,
    oportunidades,
    trabajosActivos,
    faltaCalificar,
    reputacion,
    notificaciones,
    ultimasOportunidades,
    necesidadesConOfertas,
  ] = await Promise.all([
    prisma.usuario.findUnique({ where: { id: usuarioId }, select: { creditos: true } }),
    prisma.necesidad.count({ where: { usuarioId, estado: 'publicada' } }),
    prisma.servicio.count({ where: { usuarioId, estado: 'publicado' } }),
    prisma.postulacion.count({ where: { usuarioId, estado: 'enviada' } }),
    prisma.postulacion.count({
      where: { necesidad: { usuarioId }, estado: 'enviada' },
    }),
    prisma.match.count({
      where: {
        servicio: { usuarioId, estado: 'publicado' },
        necesidad: { estado: 'publicada' },
        postuloAt: null,
        contactoAt: null,
      },
    }),
    prisma.trabajo.count({
      where: { OR: [{ solicitanteId: usuarioId }, { proveedorId: usuarioId }], estado: 'en_proceso' },
    }),
    prisma.trabajo.findMany({
      where: {
        OR: [{ solicitanteId: usuarioId }, { proveedorId: usuarioId }],
        estado: 'finalizado',
        calificaciones: { none: { autorId: usuarioId } },
      },
      include: { necesidad: { select: { titulo: true } } },
      take: 3,
    }),
    reputacionDe(usuarioId),
    prisma.notificacion.findMany({
      where: { usuarioId, leida: false },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.match.findMany({
      where: {
        servicio: { usuarioId, estado: 'publicado' },
        necesidad: { estado: 'publicada' },
        postuloAt: null,
        contactoAt: null,
      },
      include: { necesidad: { include: { categoria: true } } },
      orderBy: { puntaje: 'desc' },
      take: 3,
    }),
    prisma.necesidad.findMany({
      where: { usuarioId, estado: 'publicada' },
      include: { _count: { select: { postulaciones: { where: { estado: 'enviada' } } } } },
      orderBy: { publicadaAt: 'desc' },
      take: 3,
    }),
  ])

  const sinPublicaciones =
    (busco && misNecesidades === 0 && !ofrezco) ||
    (ofrezco && misServicios === 0 && !busco) ||
    (busco && ofrezco && misNecesidades === 0 && misServicios === 0)

  return (
    <div className="space-y-6">
      {/* El saludo con el color de la marca y el lado en el que se está: es lo
          primero que se ve al entrar y hasta ahora no decía en cuál de los dos
          paneles estaba uno. */}
      <div className="rounded-2xl border border-marino-100 bg-gradient-to-r from-marino-50 to-verde-50 px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight text-marino-900 sm:text-2xl">
              Hola, {nombre} 👋
            </h1>
            <p className="mt-0.5 text-sm text-slate-600">
              Esto es lo que está pasando con lo tuyo.
            </p>
          </div>
          <span
            className={`chip shrink-0 ${
              busco
                ? 'border-cielo-300 bg-cielo-50 text-cielo-700'
                : 'border-menta-300 bg-menta-50 text-menta-700'
            }`}
          >
            {busco ? '🔎 Busco un servicio' : '🛠️ Ofrezco un servicio'}
          </span>
        </div>
      </div>

      {/* Lo que hay que hacer AHORA va primero, antes de las cifras. */}
      {((busco && ofertasRecibidas > 0) || faltaCalificar.length > 0) && (
        <div className="space-y-3">
          {busco && ofertasRecibidas > 0 && (
            <Link
              href="/necesidades"
              className="elevar flex items-center gap-3 rounded-2xl border border-durazno-300 bg-durazno-50 px-5 py-4"
            >
              <span className="text-2xl">📨</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-durazno-700">
                  Tienes {ofertasRecibidas} oferta(s) esperando tu respuesta
                </p>
                <p className="text-sm text-slate-600">Compara y elige a quien más te convenga.</p>
              </div>
              <Icono nombre="chevron" className="h-5 w-5 shrink-0 text-durazno-500" />
            </Link>
          )}

          {faltaCalificar.map((t) => (
            <Link
              key={t.id}
              href={`/trabajos/${t.id}`}
              className="elevar flex items-center gap-3 rounded-2xl border border-sol-300 bg-sol-50 px-5 py-4"
            >
              <span className="text-2xl">⭐</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sol-700">Te falta calificar un trabajo</p>
                <p className="truncate text-sm text-slate-600">{t.necesidad.titulo}</p>
              </div>
              <Icono nombre="chevron" className="h-5 w-5 shrink-0 text-sol-500" />
            </Link>
          ))}
        </div>
      )}

      {/* Primer arranque: solo la puerta (o las puertas) que tenga activadas. */}
      {sinPublicaciones && (
        <div className={`grid gap-4 ${busco && ofrezco ? 'sm:grid-cols-2' : ''}`}>
          {busco && (
            <Link href="/necesidades/nueva" className="elevar rounded-2xl border-2 border-cielo-300 bg-cielo-50 p-6">
              <span className="text-3xl">🔎</span>
              <h2 className="mt-2 text-lg font-extrabold text-cielo-700">Busco un servicio</h2>
              <p className="mt-1 text-sm text-slate-600">
                Publica lo que necesitas y recibe ofertas.
              </p>
            </Link>
          )}
          {ofrezco && (
            <Link href="/servicios/nuevo" className="elevar rounded-2xl border-2 border-menta-300 bg-menta-50 p-6">
              <span className="text-3xl">🛠️</span>
              <h2 className="mt-2 text-lg font-extrabold text-menta-700">Ofrezco un servicio</h2>
              <p className="mt-1 text-sm text-slate-600">
                Publica lo que sabes hacer y encuentra oportunidades.
              </p>
            </Link>
          )}
        </div>
      )}


      {/* Cifras. Solo las del lado activo: una cifra que siempre marca cero
          porque esa parte está apagada se lee como un fallo de la app. */}
      {/* De 1 a 2 a 4 columnas. Antes saltaba de 2 a 4 solo en `xl`, así que en
          una tableta o un portátil normal las cifras se quedaban en dos
          columnas muy anchas con mucho hueco al lado. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {busco && (
          <Stat
            titulo="Mis necesidades"
            valor={misNecesidades}
            icono="busco"
            tono="cielo"
            href="/necesidades"
            pie="publicadas"
          />
        )}
        {ofrezco && (
          <Stat
            titulo="Mis servicios"
            valor={misServicios}
            icono="ofrezco"
            tono="menta"
            href="/servicios"
            pie="publicados"
          />
        )}
        <Stat
          titulo="Oportunidades"
          valor={oportunidades}
          icono="match"
          tono="durazno"
          href="/oportunidades"
          pie={ofrezco ? 'sin revisar' : 'servicios para ti'}
        />
        <Stat
          titulo="Créditos"
          valor={yo?.creditos ?? 0}
          icono="creditos"
          tono="marca"
          href="/creditos"
          pie="disponibles"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {ofrezco && (
          <Stat
            titulo="Mis postulaciones"
            valor={misPostulaciones}
            icono="oferta"
            tono="sol"
            href="/postulaciones"
            pie="esperando respuesta"
          />
        )}
        <Stat
          titulo="Trabajos activos"
          valor={trabajosActivos}
          icono="trabajo"
          tono="gris"
          href="/trabajos"
          pie="en proceso"
        />
        <div className="tarjeta-suave border-slate-200 bg-white">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Mi reputación</p>
          <div className="mt-2">
            <Estrellas valor={reputacion.promedio} total={reputacion.total} tam="md" />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            {reputacion.trabajosRealizados} realizados · {reputacion.trabajosContratados} contratados
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Oportunidades destacadas */}
        {ofrezco && ultimasOportunidades.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-800">🎯 Oportunidades para ti</h2>
              <Link href="/oportunidades" className="text-sm font-semibold text-marca-600 hover:underline">
                Ver todas
              </Link>
            </div>
            <div className="space-y-3">
              {ultimasOportunidades.map((m) => (
                <Link key={m.id} href={`/oportunidades/${m.id}`} className="tarjeta block">
                  <ChipMatch puntaje={m.puntaje} clase={nivelMatch(m.puntaje).clase} />
                  <h3 className="mt-2 font-bold text-slate-800">{m.necesidad.titulo}</h3>
                  <div className="mt-2 flex items-center justify-between text-sm">
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
          </section>
        )}

        {/* Mis necesidades publicadas */}
        {busco && necesidadesConOfertas.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-800">🔎 Mis necesidades</h2>
              <Link href="/necesidades" className="text-sm font-semibold text-marca-600 hover:underline">
                Ver todas
              </Link>
            </div>
            <div className="space-y-3">
              {necesidadesConOfertas.map((n) => (
                <Link key={n.id} href={`/necesidades/${n.id}`} className="tarjeta block">
                  <Chip {...NECESIDAD[n.estado]} />
                  <h3 className="mt-2 font-bold text-slate-800">{n.titulo}</h3>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-slate-500">{hace(n.publicadaAt ?? n.createdAt)}</span>
                    <span
                      className={`font-bold ${
                        n._count.postulaciones > 0 ? 'text-durazno-600' : 'text-slate-400'
                      }`}
                    >
                      {n._count.postulaciones} oferta(s)
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Notificaciones sin leer */}
      {notificaciones.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-slate-800">Novedades</h2>
            <Link href="/notificaciones" className="text-sm font-semibold text-marca-600 hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="tarjeta divide-y divide-slate-100">
            {notificaciones.map((n) => (
              <Link
                key={n.id}
                href={n.url ?? '/notificaciones'}
                className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span className="text-xl">{ICONO_NOTIFICACION[n.tipo] ?? '🔔'}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800">{n.titulo}</p>
                  <p className="text-sm text-slate-600">{n.mensaje}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">{hace(n.createdAt)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Los dos lados, siempre abajo y siempre los dos. Es el mando para pasar
          de uno al otro, no un aviso: por eso no depende de nada y cierra el
          panel. Sin tenerlo a la vista, el lado elegido en la portada el primer
          día sería para siempre en la práctica. */}
      <SelectorLado modo={efectivo} pedido={pedido} />
    </div>
  )
}
