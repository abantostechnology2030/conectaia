import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Icono } from '@/components/Icono'
import { Avatar } from '@/components/Avatar'
import { Estrellas } from '@/components/Estrellas'
import { Stat } from '@/components/Stat'
import { reputacionDe } from '@/lib/reputacion'
import { destinoSeguro } from '@/lib/destino'
import { soles, hace, antiguedad } from '@/lib/fechas'

export const dynamic = 'force-dynamic'

/**
 * Perfil público (PDR §25).
 *
 * Se muestra: foto, nombre, ciudad, descripción, calificación, trabajos
 * realizados y contratados, servicios publicados y antigüedad.
 * NO se muestra: teléfono, correo ni dirección exacta — y no es que se
 * escondan en la interfaz, es que el `select` no los pide.
 */
export default async function PerfilPublico({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ volver?: string }>
}) {
  const { id } = await params

  // A este perfil se llega desde sitios muy distintos —comparando ofertas, una
  // coincidencia, el escaparate—, y sin una forma de volver hay que tirar del
  // botón "atrás" del navegador. Quien está comparando tres ofertas pierde el
  // hilo cada vez que mira a alguien.
  //
  // ⚠️ Va por `destinoSeguro()`, no tal cual. Es una pantalla PÚBLICA: sin
  // validar, `/u/5?volver=https://otro-sitio` pondría un botón de aspecto
  // inofensivo que se lleva al usuario fuera. Solo se aceptan rutas internas;
  // cualquier otra cosa cae en cadena vacía y el botón no se pinta.
  const volver = destinoSeguro((await searchParams).volver, '')

  const usuario = await prisma.usuario.findUnique({
    where: { id: Number(id) },
    select: {
      id: true,
      rol: true,
      nombres: true,
      apellidos: true,
      ciudad: true,
      distrito: true,
      descripcion: true,
      fotoUrl: true,
      estado: true,
      createdAt: true,
      fotosHabilidades: { select: { id: true, url: true }, orderBy: { orden: 'asc' } },
    },
  })

  if (!usuario || usuario.rol !== 'usuario' || usuario.estado !== 'activo') notFound()

  const [reputacion, servicios, opiniones] = await Promise.all([
    reputacionDe(usuario.id),
    prisma.servicio.findMany({
      where: { usuarioId: usuario.id, estado: 'publicado' },
      include: { categoria: true, fotos: { take: 1, orderBy: { orden: 'asc' } } },
      orderBy: { publicadoAt: 'desc' },
    }),
    prisma.calificacion.findMany({
      where: { destinatarioId: usuario.id, oculta: false },
      include: {
        autor: { select: { id: true, nombres: true, apellidos: true, fotoUrl: true } },
        trabajo: { select: { necesidad: { select: { titulo: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ])

  const nombre = `${usuario.nombres} ${usuario.apellidos}`.trim()

  return (
    <div className="space-y-6">
      {volver && (
        <Link href={volver} className="btn-secundario">
          <Icono nombre="chevron" className="h-4 w-4 rotate-180" />
          Volver
        </Link>
      )}

      <div className="tarjeta">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar src={usuario.fotoUrl} nombre={nombre} tam={88} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold text-slate-800">{nombre}</h1>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
              <Icono nombre="ubicacion" className="h-4 w-4" />
              {[usuario.ciudad, usuario.distrito].filter(Boolean).join(' · ') || 'Sin ubicación'}
            </p>
            <div className="mt-2">
              <Estrellas valor={reputacion.promedio} total={reputacion.total} tam="md" />
            </div>
            <p className="mt-1 text-xs text-slate-400">Miembro desde {antiguedad(usuario.createdAt)}</p>
          </div>
        </div>

        {usuario.descripcion && (
          <p className="mt-4 border-t border-slate-100 pt-4 whitespace-pre-line text-slate-700">
            {usuario.descripcion}
          </p>
        )}

        {usuario.fotosHabilidades.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <h2 className="text-sm font-bold text-slate-700">Trabajos y habilidades</h2>
            <div className="mt-2 flex flex-wrap gap-3">
              {usuario.fotosHabilidades.map((f) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={f.id}
                  src={f.url}
                  alt=""
                  className="h-28 w-28 rounded-xl border border-slate-200 object-cover"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          titulo="Trabajos realizados"
          valor={reputacion.trabajosRealizados}
          icono="trabajo"
          tono="menta"
        />
        <Stat
          titulo="Trabajos contratados"
          valor={reputacion.trabajosContratados}
          icono="busco"
          tono="cielo"
        />
        <Stat titulo="Servicios publicados" valor={servicios.length} icono="ofrezco" tono="marca" />
      </div>

      {servicios.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-extrabold text-slate-800">Servicios que ofrece</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {servicios.map((s) => (
              <Link key={s.id} href={`/p/servicio/${s.id}`} className="tarjeta flex flex-col">
                {s.fotos[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.fotos[0].url} alt="" className="mb-3 h-32 w-full rounded-xl object-cover" />
                )}
                <span className="chip w-fit border-menta-300 bg-menta-50 text-menta-700">
                  {s.categoria.icono} {s.categoria.nombre}
                </span>
                <h3 className="mt-2 font-bold text-slate-800">{s.nombre}</h3>
                <p className="lineas-2 mt-1 flex-1 text-sm text-slate-600">{s.descripcion}</p>
                <p className="mt-3 border-t border-slate-100 pt-3 text-sm font-extrabold text-marca-700">
                  Desde {soles(s.precioDesde, '—')}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-extrabold text-slate-800">
          Calificaciones recibidas{' '}
          <span className="text-sm font-semibold text-slate-500">({reputacion.total})</span>
        </h2>

        {opiniones.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
            Todavía no tiene calificaciones.
          </p>
        ) : (
          <div className="space-y-3">
            {opiniones.map((o) => (
              <article key={o.id} className="tarjeta">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={o.autor.fotoUrl}
                    nombre={`${o.autor.nombres} ${o.autor.apellidos}`}
                    tam={40}
                  />
                  <div className="min-w-0">
                    <Link href={`/u/${o.autor.id}`} className="font-bold text-slate-800 hover:underline">
                      {`${o.autor.nombres} ${o.autor.apellidos}`.trim()}
                    </Link>
                    <Estrellas valor={o.estrellas} />
                  </div>
                  <div className="ml-auto shrink-0 text-right">
                    <span
                      className={`chip ${
                        o.papel === 'solicitante'
                          ? 'border-cielo-300 bg-cielo-50 text-cielo-700'
                          : 'border-menta-300 bg-menta-50 text-menta-700'
                      }`}
                    >
                      {o.papel === 'solicitante' ? 'Como proveedor' : 'Como cliente'}
                    </span>
                    <p className="mt-1 text-xs text-slate-400">{hace(o.createdAt)}</p>
                  </div>
                </div>

                <p className="mt-2 text-xs text-slate-400">{o.trabajo.necesidad.titulo}</p>
                {o.comentario && (
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{o.comentario}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
