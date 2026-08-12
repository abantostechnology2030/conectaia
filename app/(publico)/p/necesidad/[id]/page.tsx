import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { Icono } from '@/components/Icono'
import { Avatar } from '@/components/Avatar'
import { Estrellas } from '@/components/Estrellas'
import { reputacionDe } from '@/lib/reputacion'
import { cuando } from '@/lib/urgencia'
import { soles, fecha, hace, antiguedad } from '@/lib/fechas'

export const dynamic = 'force-dynamic'

/**
 * Ficha pública de una necesidad. Se ve sin cuenta, con la información
 * PÚBLICA del PDR §37: tipo, título, categoría, ubicación aproximada, precio y
 * fecha. Nunca teléfono, correo ni dirección exacta.
 */
export default async function NecesidadPublica({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const usuarioId = session?.user ? Number(session.user.id) : null

  const necesidad = await prisma.necesidad.findUnique({
    where: { id: Number(id) },
    include: {
      categoria: true,
      subcategoria: true,
      fotos: { orderBy: { orden: 'asc' } },
      usuario: {
        select: { id: true, nombres: true, apellidos: true, fotoUrl: true, ciudad: true, descripcion: true, createdAt: true },
      },
      _count: { select: { postulaciones: { where: { estado: 'enviada' } } } },
    },
  })

  if (!necesidad || necesidad.estado !== 'publicada') notFound()

  const esMia = usuarioId === necesidad.usuarioId
  const reputacion = await reputacionDe(necesidad.usuarioId)

  // Si ya me postulé, no se ofrece hacerlo otra vez (PDR §11).
  const yaPostulado = usuarioId
    ? await prisma.postulacion.findUnique({
        where: { necesidadId_usuarioId: { necesidadId: necesidad.id, usuarioId } },
        select: { id: true },
      })
    : null

  // Para postularse desde aquí hace falta llegar por una oportunidad, que es
  // donde vive el formulario. Se busca si existe una coincidencia con alguno
  // de mis servicios para poder enlazarla.
  const match = usuarioId
    ? await prisma.match.findFirst({
        where: { necesidadId: necesidad.id, servicio: { usuarioId } },
        orderBy: { puntaje: 'desc' },
        select: { id: true },
      })
    : null

  const autor = necesidad.usuario
  const nombreAutor = `${autor.nombres} ${autor.apellidos}`.trim()

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <article className="tarjeta">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip border-cielo-300 bg-cielo-50 text-cielo-700">🔎 Necesidad</span>
            <span className="chip border-slate-200 bg-slate-50 text-slate-600">
              {necesidad.categoria.icono} {necesidad.categoria.nombre}
            </span>
            {(necesidad.subcategoria || necesidad.subcategoriaOtra) && (
              <span className="chip border-slate-200 bg-slate-50 text-slate-600">
                {necesidad.subcategoria?.nombre ?? necesidad.subcategoriaOtra}
              </span>
            )}
          </div>

          <h1 className="mt-3 text-2xl font-extrabold text-slate-800">{necesidad.titulo}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Publicada {hace(necesidad.publicadaAt ?? necesidad.createdAt)} ·{' '}
            {necesidad._count.postulaciones} oferta(s) recibidas
          </p>

          <p className="mt-4 whitespace-pre-line text-slate-700">{necesidad.descripcion}</p>

          {necesidad.fotos.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {necesidad.fotos.map((f) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={f.id} src={f.url} alt="" className="h-36 w-full rounded-xl object-cover" />
              ))}
            </div>
          )}

          <dl className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
            <Dato icono="creditos" etiqueta="Presupuesto" valor={soles(necesidad.precioOfrecido)} />
            <Dato
              icono="ubicacion"
              etiqueta="Ubicación aproximada"
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
              <h2 className="text-sm font-bold text-slate-700">Observaciones</h2>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{necesidad.observaciones}</p>
            </div>
          )}
        </article>
      </div>

      <aside className="space-y-4">
        <div className="tarjeta">
          <h2 className="font-bold text-slate-700">¿Puedes hacerlo?</h2>

          {esMia ? (
            <>
              <p className="mt-2 text-sm text-slate-600">Esta es tu propia necesidad.</p>
              <Link href={`/necesidades/${necesidad.id}`} className="btn-primario mt-3 w-full">
                Ver las ofertas recibidas
              </Link>
            </>
          ) : yaPostulado ? (
            <>
              <p className="mt-2 text-sm text-slate-600">Ya enviaste tu oferta para este trabajo.</p>
              <Link href="/postulaciones" className="btn-secundario mt-3 w-full">
                Ver mis postulaciones
              </Link>
            </>
          ) : !usuarioId ? (
            <>
              <p className="mt-2 text-sm text-slate-600">
                Crea tu cuenta para enviar una oferta. Postularte es gratis.
              </p>
              <Link href="/registro" className="btn-primario mt-3 w-full">
                Crear cuenta y postularme
              </Link>
              <Link href="/login" className="btn-secundario mt-2 w-full">
                Ya tengo cuenta
              </Link>
            </>
          ) : match ? (
            <>
              <p className="mt-2 text-sm text-slate-600">
                Esta necesidad encaja con uno de tus servicios. Postularte es gratis.
              </p>
              <Link href={`/oportunidades/${match.id}`} className="btn-primario mt-3 w-full">
                Ver la oportunidad y postularme
              </Link>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-slate-600">
                Publica un servicio en esta categoría y podrás postularte a este trabajo.
              </p>
              <Link href="/servicios/nuevo" className="btn-menta mt-3 w-full">
                Publicar un servicio
              </Link>
            </>
          )}
        </div>

        <div className="tarjeta">
          <h2 className="font-bold text-slate-700">Quién lo publicó</h2>
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
            <p className="text-slate-500">{reputacion.trabajosContratados} trabajo(s) contratados</p>
            <p className="text-slate-400">Miembro desde {antiguedad(autor.createdAt)}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="flex items-center gap-2 font-bold text-slate-700">
            <Icono nombre="candado" className="h-5 w-5 text-slate-400" />
            Datos protegidos
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            El teléfono, el correo y la dirección exacta de quien publica no se muestran. Se comparten
            solo cuando alguna de las dos partes decide conectar.
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
