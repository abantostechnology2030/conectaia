import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Encabezado } from '@/components/Encabezado'
import { Vacio } from '@/components/Vacio'
import { Icono } from '@/components/Icono'
import { Avatar } from '@/components/Avatar'
import { Estrellas } from '@/components/Estrellas'
import { Paginacion } from '@/components/Paginacion'
import { reputacionDeVarios } from '@/lib/reputacion'
import { soles, hace } from '@/lib/fechas'

export const dynamic = 'force-dynamic'

const POR_PAGINA = 12

/**
 * Escaparate público: las dos caras del marketplace en un solo buscador.
 *
 * Se ve sin iniciar sesión a propósito — un marketplace vacío detrás de un
 * login no convence a nadie de registrarse. Lo que NUNCA aparece aquí son los
 * datos de contacto: para eso hace falta cuenta y un desbloqueo.
 */
export default async function Buscar({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; q?: string; categoria?: string; ciudad?: string; p?: string }>
}) {
  const sp = await searchParams
  const tipo = sp.tipo === 'servicio' ? 'servicio' : 'necesidad'
  const q = (sp.q ?? '').trim()
  const categoriaId = sp.categoria ? Number(sp.categoria) : null
  const ciudad = (sp.ciudad ?? '').trim()

  const categorias = await prisma.categoria.findMany({
    where: { activa: true },
    orderBy: { orden: 'asc' },
  })

  // SQLite no distingue mayúsculas con `contains` en columnas sin COLLATE
  // NOCASE, así que la búsqueda por texto se hace además contra `claves`, que
  // ya está normalizada al guardar.
  const filtroTexto = q
    ? {
        OR:
          tipo === 'necesidad'
            ? [
                { titulo: { contains: q } },
                { descripcion: { contains: q } },
                { claves: { contains: q.toLowerCase() } },
              ]
            : [
                { nombre: { contains: q } },
                { descripcion: { contains: q } },
                { claves: { contains: q.toLowerCase() } },
              ],
      }
    : {}

  const filtro = {
    ...(tipo === 'necesidad' ? { estado: 'publicada' } : { estado: 'publicado' }),
    ...(categoriaId ? { categoriaId } : {}),
    ...(ciudad ? { ciudad: { contains: ciudad } } : {}),
    ...filtroTexto,
  }

  const total =
    tipo === 'necesidad'
      ? await prisma.necesidad.count({ where: filtro as never })
      : await prisma.servicio.count({ where: filtro as never })

  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA))
  const pagina = Math.min(Math.max(1, Number(sp.p) || 1), paginas)
  const saltar = (pagina - 1) * POR_PAGINA

  return (
    <div className="space-y-6">
      <Encabezado
        titulo="Explorar"
        subtitulo={`${total} ${tipo === 'necesidad' ? 'necesidad(es)' : 'servicio(s)'} encontrados`}
        icono="buscar"
      />

      {/* Las dos caras */}
      <div className="flex gap-2">
        <Link
          href="/buscar?tipo=necesidad"
          className={`chip ${
            tipo === 'necesidad'
              ? 'border-cielo-500 bg-cielo-500 text-white'
              : 'border-slate-300 bg-white text-slate-600'
          }`}
        >
          🔎 Necesidades publicadas
        </Link>
        <Link
          href="/buscar?tipo=servicio"
          className={`chip ${
            tipo === 'servicio'
              ? 'border-menta-500 bg-menta-500 text-white'
              : 'border-slate-300 bg-white text-slate-600'
          }`}
        >
          🛠️ Servicios ofrecidos
        </Link>
      </div>

      {/* Filtros: formulario GET para que la búsqueda quede en la URL. */}
      <form method="get" className="tarjeta grid gap-3 sm:grid-cols-4">
        <input type="hidden" name="tipo" value={tipo} />
        <div className="sm:col-span-2">
          <label className="etiqueta" htmlFor="q">
            Buscar
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            className="campo"
            placeholder="pintura, gasfitero, computadora…"
          />
        </div>
        <div>
          <label className="etiqueta" htmlFor="categoria">
            Categoría
          </label>
          <select id="categoria" name="categoria" defaultValue={categoriaId ?? ''} className="campo">
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icono} {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="etiqueta" htmlFor="ciudad">
            Ciudad
          </label>
          <input id="ciudad" name="ciudad" defaultValue={ciudad} className="campo" placeholder="Cajamarca" />
        </div>
        <div className="sm:col-span-4">
          <button type="submit" className="btn-primario">
            Buscar
          </button>
        </div>
      </form>

      {total === 0 ? (
        <Vacio
          emoji="🔍"
          titulo="No encontramos nada con esos filtros"
          mensaje="Prueba con otras palabras, otra categoría u otra ciudad."
          accion={{ href: `/buscar?tipo=${tipo}`, label: 'Quitar filtros' }}
        />
      ) : tipo === 'necesidad' ? (
        <ListaNecesidades filtro={filtro} saltar={saltar} />
      ) : (
        <ListaServicios filtro={filtro} saltar={saltar} />
      )}

      <Paginacion
        pagina={pagina}
        paginas={paginas}
        base="/buscar"
        params={{ tipo, q, categoria: sp.categoria, ciudad }}
      />
    </div>
  )
}

async function ListaNecesidades({ filtro, saltar }: { filtro: unknown; saltar: number }) {
  const necesidades = await prisma.necesidad.findMany({
    where: filtro as never,
    include: { categoria: true, fotos: { take: 1, orderBy: { orden: 'asc' } } },
    orderBy: { publicadaAt: 'desc' },
    skip: saltar,
    take: POR_PAGINA,
  })

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {necesidades.map((n) => (
        <Link key={n.id} href={`/p/necesidad/${n.id}`} className="tarjeta flex flex-col">
          {n.fotos[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={n.fotos[0].url} alt="" className="mb-3 h-36 w-full rounded-xl object-cover" />
          )}
          <span className="chip w-fit border-cielo-300 bg-cielo-50 text-cielo-700">
            {n.categoria.icono} {n.categoria.nombre}
          </span>
          <h2 className="mt-2 font-bold text-slate-800">{n.titulo}</h2>
          <p className="lineas-2 mt-1 flex-1 text-sm text-slate-600">{n.descripcion}</p>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
            <span className="inline-flex items-center gap-1 text-slate-500">
              <Icono nombre="ubicacion" className="h-4 w-4" />
              {n.ciudad}
            </span>
            <span className="font-extrabold text-marca-700">{soles(n.precioOfrecido)}</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">{hace(n.publicadaAt ?? n.createdAt)}</p>
        </Link>
      ))}
    </div>
  )
}

async function ListaServicios({ filtro, saltar }: { filtro: unknown; saltar: number }) {
  const servicios = await prisma.servicio.findMany({
    where: filtro as never,
    include: {
      categoria: true,
      fotos: { take: 1, orderBy: { orden: 'asc' } },
      usuario: { select: { id: true, nombres: true, apellidos: true, fotoUrl: true } },
    },
    orderBy: { publicadoAt: 'desc' },
    skip: saltar,
    take: POR_PAGINA,
  })

  const reps = await reputacionDeVarios(servicios.map((s) => s.usuarioId))

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {servicios.map((s) => {
        const r = reps.get(s.usuarioId)
        const nombre = `${s.usuario.nombres} ${s.usuario.apellidos}`.trim()
        return (
          <Link key={s.id} href={`/p/servicio/${s.id}`} className="tarjeta flex flex-col">
            {s.fotos[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.fotos[0].url} alt="" className="mb-3 h-36 w-full rounded-xl object-cover" />
            )}
            <span className="chip w-fit border-menta-300 bg-menta-50 text-menta-700">
              {s.categoria.icono} {s.categoria.nombre}
            </span>
            <h2 className="mt-2 font-bold text-slate-800">{s.nombre}</h2>

            <div className="mt-2 flex items-center gap-2">
              <Avatar src={s.usuario.fotoUrl} nombre={nombre} tam={28} />
              <span className="truncate text-sm text-slate-600">{nombre}</span>
            </div>

            <p className="lineas-2 mt-2 flex-1 text-sm text-slate-600">{s.descripcion}</p>

            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
              <Estrellas valor={r?.promedio ?? 0} total={r?.total ?? 0} />
              <span className="font-extrabold text-marca-700">
                Desde {soles(s.precioDesde, '—')}
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
