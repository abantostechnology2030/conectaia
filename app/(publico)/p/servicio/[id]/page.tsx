import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { Icono } from '@/components/Icono'
import { Avatar } from '@/components/Avatar'
import { Estrellas } from '@/components/Estrellas'
import { reputacionDe } from '@/lib/reputacion'
import { soles, hace, antiguedad } from '@/lib/fechas'

export const dynamic = 'force-dynamic'

// Ficha pública de un servicio. Mismo criterio que la de necesidad: todo lo
// público, nada de contacto.
export default async function ServicioPublico({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const usuarioId = session?.user ? Number(session.user.id) : null

  const servicio = await prisma.servicio.findUnique({
    where: { id: Number(id) },
    include: {
      categoria: true,
      subcategoria: true,
      fotos: { orderBy: { orden: 'asc' } },
      usuario: {
        select: { id: true, nombres: true, apellidos: true, fotoUrl: true, ciudad: true, descripcion: true, createdAt: true },
      },
    },
  })

  if (!servicio || servicio.estado !== 'publicado') notFound()

  const esMio = usuarioId === servicio.usuarioId
  const reputacion = await reputacionDe(servicio.usuarioId)

  // Últimas opiniones que ha recibido esta persona como proveedora.
  const opiniones = await prisma.calificacion.findMany({
    where: { destinatarioId: servicio.usuarioId, oculta: false, papel: 'solicitante' },
    include: { autor: { select: { nombres: true, apellidos: true, fotoUrl: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  const autor = servicio.usuario
  const nombreAutor = `${autor.nombres} ${autor.apellidos}`.trim()

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <article className="tarjeta-suave border-menta-200 bg-menta-50">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip border-menta-300 bg-white text-menta-700">🛠️ Servicio</span>
            <span className="chip border-slate-200 bg-white text-slate-600">
              {servicio.categoria.icono} {servicio.categoria.nombre}
            </span>
            {(servicio.subcategoria || servicio.subcategoriaOtra) && (
              <span className="chip border-slate-200 bg-white text-slate-600">
                {servicio.subcategoria?.nombre ?? servicio.subcategoriaOtra}
              </span>
            )}
          </div>

          <h1 className="mt-3 text-2xl font-extrabold text-slate-800">{servicio.nombre}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Publicado {hace(servicio.publicadoAt ?? servicio.createdAt)}
          </p>

          <p className="mt-4 whitespace-pre-line text-slate-700">{servicio.descripcion}</p>

          {servicio.fotos.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {servicio.fotos.map((f) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={f.id} src={f.url} alt="" className="h-36 w-full rounded-xl object-cover" />
              ))}
            </div>
          )}

          <dl className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
            <Dato icono="creditos" etiqueta="Precio desde" valor={soles(servicio.precioDesde, '—')} />
            <Dato icono="ubicacion" etiqueta="Zona" valor={servicio.zona || servicio.ciudad} />
            {servicio.experiencia && (
              <Dato icono="trabajo" etiqueta="Experiencia" valor={servicio.experiencia} />
            )}
            {servicio.disponibilidad && (
              <Dato icono="reloj" etiqueta="Disponibilidad" valor={servicio.disponibilidad} />
            )}
          </dl>

          {servicio.observaciones && (
            <div className="mt-4 rounded-xl border border-menta-200 bg-white p-4">
              <h2 className="text-sm font-bold text-slate-700">Observaciones</h2>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{servicio.observaciones}</p>
            </div>
          )}
        </article>

        {opiniones.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-extrabold text-slate-800">Lo que dicen sus clientes</h2>
            <div className="space-y-3">
              {opiniones.map((o) => (
                <article key={o.id} className="tarjeta">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={o.autor.fotoUrl}
                      nombre={`${o.autor.nombres} ${o.autor.apellidos}`}
                      tam={36}
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800">
                        {`${o.autor.nombres} ${o.autor.apellidos}`.trim()}
                      </p>
                      <Estrellas valor={o.estrellas} />
                    </div>
                    <span className="ml-auto shrink-0 text-xs text-slate-400">{hace(o.createdAt)}</span>
                  </div>
                  {o.comentario && (
                    <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{o.comentario}</p>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      <aside className="space-y-4">
        <div className="tarjeta">
          <h2 className="font-bold text-slate-700">¿Te interesa este servicio?</h2>

          {esMio ? (
            <>
              <p className="mt-2 text-sm text-slate-600">Este es tu propio servicio.</p>
              <Link href={`/servicios/${servicio.id}`} className="btn-primario mt-3 w-full">
                Administrar mi servicio
              </Link>
            </>
          ) : !usuarioId ? (
            <>
              <p className="mt-2 text-sm text-slate-600">
                Publica lo que necesitas y {autor.nombres} podrá enviarte una oferta.
              </p>
              <Link href="/registro" className="btn-primario mt-3 w-full">
                Crear cuenta y publicar
              </Link>
              <Link href="/login" className="btn-secundario mt-2 w-full">
                Ya tengo cuenta
              </Link>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-slate-600">
                Publica tu necesidad en esta categoría: te mostraremos a {autor.nombres} entre los
                servicios compatibles y podrá enviarte una oferta.
              </p>
              <Link href="/necesidades/nueva" className="btn-cielo mt-3 w-full">
                Publicar mi necesidad
              </Link>
            </>
          )}
        </div>

        <div className="tarjeta">
          <h2 className="font-bold text-slate-700">Quién lo ofrece</h2>
          <div className="mt-3 flex items-center gap-3">
            <Avatar src={autor.fotoUrl} nombre={nombreAutor} tam={52} />
            <div className="min-w-0">
              <Link href={`/u/${autor.id}`} className="font-bold text-slate-800 hover:underline">
                {nombreAutor}
              </Link>
              <p className="text-sm text-slate-500">{autor.ciudad}</p>
            </div>
          </div>
          <div className="mt-3 space-y-1 text-sm">
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

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="flex items-center gap-2 font-bold text-slate-700">
            <Icono nombre="candado" className="h-5 w-5 text-slate-400" />
            Datos protegidos
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            El teléfono y el correo de {autor.nombres} no se muestran. Se comparten solo cuando alguna
            de las dos partes decide conectar.
          </p>
        </div>
      </aside>
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
