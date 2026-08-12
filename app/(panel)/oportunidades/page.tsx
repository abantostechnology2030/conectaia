import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { Encabezado } from '@/components/Encabezado'
import { Vacio } from '@/components/Vacio'
import { ChipMatch } from '@/components/Chip'
import { Icono } from '@/components/Icono'
import { Avatar } from '@/components/Avatar'
import { Estrellas } from '@/components/Estrellas'
import { nivelMatch } from '@/lib/matching'
import { reputacionDeVarios } from '@/lib/reputacion'
import { soles } from '@/lib/fechas'
import { usuarioActual, puedeBuscar, puedeOfrecer } from '@/lib/modos'

export const dynamic = 'force-dynamic'

/**
 * Las dos caras del matching (PDR §37).
 *
 * · OPORTUNIDADES PARA MÍ — necesidades de otros que encajan con MIS servicios.
 * · SERVICIOS PARA MÍ     — servicios de otros que encajan con MIS necesidades.
 *
 * Se muestran en la misma pantalla, separadas por pestañas, porque son la
 * misma tabla `Match` leída desde los dos lados: cambia solo qué extremo es
 * mío. Mantenerlas juntas es lo que hace evidente que ConectaIA es UN
 * marketplace bidireccional y no dos listados sueltos.
 */
export default async function Oportunidades({
  searchParams,
}: {
  searchParams: Promise<{ lado?: string }>
}) {
  const sp = await searchParams
  const session = await auth()
  const usuarioId = Number(session!.user.id)

  const { modo } = await usuarioActual()
  const ofrezco = puedeOfrecer(modo)
  const busco = puedeBuscar(modo)

  // La pestaña por defecto es la del lado activo. Quien solo busca servicios
  // no tiene "oportunidades para mí" que valgan: lo suyo son los profesionales
  // compatibles con lo que publicó.
  const lado = sp.lado ?? (ofrezco ? 'para-mi' : 'servicios')

  const [totalParaMi, totalServicios] = await Promise.all([
    prisma.match.count({
      where: {
        servicio: { usuarioId, estado: 'publicado' },
        necesidad: { estado: 'publicada' },
        contactoAt: null,
        postuloAt: null,
      },
    }),
    prisma.match.count({
      where: {
        necesidad: { usuarioId, estado: 'publicada' },
        servicio: { estado: 'publicado' },
      },
    }),
  ])

  return (
    <div className="space-y-6">
      {/* El mismo rótulo que el menú, y por el mismo motivo: desde la oferta
          esto son trabajos posibles; desde la demanda, gente que podría
          hacerlo. Si el menú y el título no coinciden, parecen dos pantallas. */}
      <Encabezado
        titulo={ofrezco ? 'Mis oportunidades de trabajo' : 'Posibles trabajadores'}
        subtitulo="Coincidencias que ConectaIA encontró para ti"
        icono="match"
      />

      {/* Las pestañas solo aparecen si hay las dos: con un solo lado activo,
          una pestaña única es ruido. */}
      {busco && ofrezco && (
        <div className="flex gap-2">
          <Link
            href="/oportunidades?lado=para-mi"
            className={`chip ${
              lado !== 'servicios'
                ? 'border-durazno-500 bg-durazno-500 text-white'
                : 'border-slate-300 bg-white text-slate-600'
            }`}
          >
            🎯 Oportunidades para mí ({totalParaMi})
          </Link>
          <Link
            href="/oportunidades?lado=servicios"
            className={`chip ${
              lado === 'servicios'
                ? 'border-cielo-500 bg-cielo-500 text-white'
                : 'border-slate-300 bg-white text-slate-600'
            }`}
          >
            🤝 Servicios para mí ({totalServicios})
          </Link>
        </div>
      )}

      {/* Con un lado apagado se fuerza el que corresponde, aunque la URL pida
          el otro: si no, bastaría con escribir ?lado=para-mi para colarse. */}
      {(ofrezco && lado !== 'servicios') || !busco ? (
        <ParaMi usuarioId={usuarioId} />
      ) : (
        <ServiciosParaMi usuarioId={usuarioId} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Necesidades compatibles con MIS servicios (PDR §20)
// ---------------------------------------------------------------------------
async function ParaMi({ usuarioId }: { usuarioId: number }) {
  const matches = await prisma.match.findMany({
    where: {
      servicio: { usuarioId, estado: 'publicado' },
      necesidad: { estado: 'publicada' },
    },
    include: {
      necesidad: { include: { categoria: true, fotos: { take: 1, orderBy: { orden: 'asc' } } } },
      servicio: { select: { id: true, nombre: true } },
    },
    orderBy: [{ puntaje: 'desc' }, { createdAt: 'desc' }],
    take: 40,
  })

  const tieneServicios = await prisma.servicio.count({ where: { usuarioId, estado: 'publicado' } })

  if (tieneServicios === 0) {
    return (
      <Vacio
        emoji="🛠️"
        titulo="Publica un servicio para recibir oportunidades"
        mensaje="Cuando publiques lo que sabes hacer, ConectaIA buscará necesidades compatibles y te las mostrará aquí."
        accion={{ href: '/servicios/nuevo', label: 'Publicar un servicio' }}
      />
    )
  }

  if (matches.length === 0) {
    return (
      <Vacio
        emoji="🎯"
        titulo="Todavía no hay coincidencias"
        mensaje="Aún no encontramos necesidades que encajen con tus servicios. Te avisaremos en cuanto aparezca alguna."
        accion={{ href: '/buscar?tipo=necesidad', label: 'Explorar necesidades' }}
      />
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {matches.map((m) => (
        <Link key={m.id} href={`/oportunidades/${m.id}`} className="tarjeta flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <ChipMatch puntaje={m.puntaje} clase={nivelMatch(m.puntaje).clase} />
            {m.postuloAt && (
              <span className="chip border-menta-300 bg-menta-50 text-menta-700">Ya te postulaste</span>
            )}
          </div>

          <span className="mt-2 chip w-fit border-slate-200 bg-slate-50 text-slate-600">
            {m.necesidad.categoria.icono} {m.necesidad.categoria.nombre}
          </span>

          <h3 className="mt-2 font-bold text-slate-800">{m.necesidad.titulo}</h3>
          <p className="lineas-2 mt-1 flex-1 text-sm text-slate-600">{m.necesidad.descripcion}</p>

          <p className="mt-2 text-xs text-slate-400">Con tu servicio: {m.servicio.nombre}</p>

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
            <span className="inline-flex items-center gap-1 text-slate-500">
              <Icono nombre="ubicacion" className="h-4 w-4" />
              {m.necesidad.ciudad}
            </span>
            <span className="font-extrabold text-marca-700">{soles(m.necesidad.precioOfrecido)}</span>
          </div>
        </Link>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Servicios compatibles con MIS necesidades (PDR §21)
// ---------------------------------------------------------------------------
async function ServiciosParaMi({ usuarioId }: { usuarioId: number }) {
  const matches = await prisma.match.findMany({
    where: {
      necesidad: { usuarioId, estado: 'publicada' },
      servicio: { estado: 'publicado' },
    },
    include: {
      servicio: {
        include: {
          categoria: true,
          usuario: { select: { id: true, nombres: true, apellidos: true, fotoUrl: true, ciudad: true } },
        },
      },
      necesidad: { select: { id: true, titulo: true } },
    },
    orderBy: [{ puntaje: 'desc' }, { createdAt: 'desc' }],
    take: 40,
  })

  const tieneNecesidades = await prisma.necesidad.count({ where: { usuarioId, estado: 'publicada' } })

  if (tieneNecesidades === 0) {
    return (
      <Vacio
        emoji="🔎"
        titulo="Publica una necesidad para ver servicios compatibles"
        mensaje="Cuando publiques lo que necesitas, te mostraremos aquí a los profesionales que pueden hacerlo."
        accion={{ href: '/necesidades/nueva', label: 'Publicar una necesidad' }}
      />
    )
  }

  if (matches.length === 0) {
    return (
      <Vacio
        emoji="🤝"
        titulo="Todavía no hay servicios compatibles"
        mensaje="Aún no encontramos profesionales que ofrezcan lo que buscas. Sigue atento: tus necesidades ya están visibles para ellos."
        accion={{ href: '/buscar?tipo=servicio', label: 'Explorar servicios' }}
      />
    )
  }

  const reps = await reputacionDeVarios(matches.map((m) => m.servicio.usuarioId))

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {matches.map((m) => {
        const r = reps.get(m.servicio.usuarioId)
        const nombre = `${m.servicio.usuario.nombres} ${m.servicio.usuario.apellidos}`.trim()
        return (
          // A la ficha de la COINCIDENCIA, no a la del servicio: aquí hay algo
          // que hacer (ver por qué encaja y contactar). La ficha pública del
          // servicio solo informa, y llegar ahí desde una coincidencia era un
          // callejón sin salida — invitaba a "publicar mi necesidad" a alguien
          // que ya la tenía publicada.
          <Link key={m.id} href={`/oportunidades/${m.id}`} className="tarjeta flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <ChipMatch puntaje={m.puntaje} clase={nivelMatch(m.puntaje).clase} />
              {m.contactoAt && (
                <span className="chip border-menta-300 bg-menta-50 text-menta-700">
                  Contacto abierto
                </span>
              )}
            </div>

            <div className="mt-3 flex items-center gap-3">
              <Avatar src={m.servicio.usuario.fotoUrl} nombre={nombre} tam={44} />
              <div className="min-w-0">
                <p className="truncate font-bold text-slate-800">{nombre}</p>
                <Estrellas valor={r?.promedio ?? 0} total={r?.total ?? 0} />
              </div>
            </div>

            <h3 className="mt-3 font-bold text-slate-800">{m.servicio.nombre}</h3>
            <p className="lineas-2 mt-1 flex-1 text-sm text-slate-600">{m.servicio.descripcion}</p>

            <p className="mt-2 text-xs text-slate-400">Para tu necesidad: {m.necesidad.titulo}</p>

            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
              <span className="text-slate-500">{r?.trabajosRealizados ?? 0} trabajo(s)</span>
              <span className="font-extrabold text-marca-700">
                Desde {soles(m.servicio.precioDesde, '—')}
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
