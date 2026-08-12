import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Encabezado } from '@/components/Encabezado'
import { Stat } from '@/components/Stat'
import { Vacio } from '@/components/Vacio'
import { ChipMatch } from '@/components/Chip'
import { Paginacion } from '@/components/Paginacion'
import { nivelMatch, PESOS } from '@/lib/matching'
import { fechaHora } from '@/lib/fechas'
import { getConfig } from '@/lib/config'

export const dynamic = 'force-dynamic'

const POR_PAGINA = 25

// Auditoría del matching (PDR §39-40): qué coincidencias se detectaron y en
// qué acabaron.
export default async function AdminMatching({
  searchParams,
}: {
  searchParams: Promise<{ etapa?: string; p?: string }>
}) {
  const sp = await searchParams
  const etapa = sp.etapa ?? ''

  const donde =
    etapa === 'vistos'
      ? { vistoAt: { not: null } }
      : etapa === 'postulados'
        ? { postuloAt: { not: null } }
        : etapa === 'contactados'
          ? { contactoAt: { not: null } }
          : etapa === 'sin_ver'
            ? { vistoAt: null }
            : {}

  const [total, detectados, vistos, postulados, contactados, cfg] = await Promise.all([
    prisma.match.count({ where: donde }),
    prisma.match.count(),
    prisma.match.count({ where: { vistoAt: { not: null } } }),
    prisma.match.count({ where: { postuloAt: { not: null } } }),
    prisma.match.count({ where: { contactoAt: { not: null } } }),
    getConfig(),
  ])

  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA))
  const pagina = Math.min(Math.max(1, Number(sp.p) || 1), paginas)

  const matches = await prisma.match.findMany({
    where: donde,
    include: {
      necesidad: { select: { id: true, titulo: true, ciudad: true, usuario: { select: { nombres: true, apellidos: true } } } },
      servicio: { select: { id: true, nombre: true, usuario: { select: { nombres: true, apellidos: true } } } },
    },
    orderBy: [{ puntaje: 'desc' }, { createdAt: 'desc' }],
    skip: (pagina - 1) * POR_PAGINA,
    take: POR_PAGINA,
  })

  const FILTROS = [
    { id: '', label: 'Todas' },
    { id: 'sin_ver', label: 'Sin ver' },
    { id: 'vistos', label: 'Consultadas' },
    { id: 'postulados', label: 'Con postulación' },
    { id: 'contactados', label: 'Con contacto' },
  ]

  return (
    <div className="space-y-6">
      <Encabezado
        titulo="Matching"
        subtitulo="Coincidencias detectadas entre necesidades y servicios"
        icono="match"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat titulo="Detectadas" valor={detectados} icono="match" tono="marca" />
        <Stat titulo="Consultadas" valor={vistos} icono="buscar" tono="cielo" />
        <Stat titulo="Con postulación" valor={postulados} icono="oferta" tono="sol" />
        <Stat titulo="Con contacto" valor={contactados} icono="trabajo" tono="menta" />
      </div>

      <div className="tarjeta">
        <h2 className="font-bold text-slate-700">Cómo se calcula el puntaje</h2>
        <p className="mt-1 text-sm text-slate-500">
          Suma de seis factores sobre 100. Solo se guardan las coincidencias que llegan al mínimo
          configurado ({cfg.match_minimo}%).
        </p>
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          {Object.entries(PESOS).map(([nombre, peso]) => (
            <li key={nombre} className="chip border-slate-200 bg-slate-50 text-slate-600">
              {nombre}: {peso}
            </li>
          ))}
        </ul>
      </div>

      <div className="scroll-x flex gap-2">
        {FILTROS.map((f) => (
          <Link
            key={f.id}
            href={f.id ? `/admin/matching?etapa=${f.id}` : '/admin/matching'}
            className={`chip whitespace-nowrap ${
              etapa === f.id
                ? 'border-marca-500 bg-marca-500 text-white'
                : 'border-slate-300 bg-white text-slate-600'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {matches.length === 0 ? (
        <Vacio
          emoji="🎯"
          titulo="No hay coincidencias con ese filtro"
          mensaje="Las coincidencias se calculan al publicar o editar una necesidad o un servicio."
        />
      ) : (
        <div className="tarjeta scroll-x">
          <table className="tabla">
            <thead>
              <tr>
                <th>Compatibilidad</th>
                <th>Necesidad</th>
                <th>Servicio</th>
                <th>Ciudad</th>
                <th>Consultada</th>
                <th>Postulación</th>
                <th>Contacto</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr key={m.id}>
                  <td>
                    <ChipMatch puntaje={m.puntaje} clase={nivelMatch(m.puntaje).clase} />
                  </td>
                  <td className="max-w-56">
                    <Link href={`/p/necesidad/${m.necesidad.id}`} className="font-semibold hover:underline">
                      {m.necesidad.titulo}
                    </Link>
                    <p className="text-xs text-slate-400">
                      {m.necesidad.usuario.nombres} {m.necesidad.usuario.apellidos}
                    </p>
                  </td>
                  <td className="max-w-56">
                    <Link href={`/p/servicio/${m.servicio.id}`} className="font-semibold hover:underline">
                      {m.servicio.nombre}
                    </Link>
                    <p className="text-xs text-slate-400">
                      {m.servicio.usuario.nombres} {m.servicio.usuario.apellidos}
                    </p>
                  </td>
                  <td>{m.necesidad.ciudad}</td>
                  <td className="whitespace-nowrap text-slate-500">
                    {m.vistoAt ? fechaHora(m.vistoAt) : '—'}
                  </td>
                  <td className="whitespace-nowrap text-slate-500">
                    {m.postuloAt ? fechaHora(m.postuloAt) : '—'}
                  </td>
                  <td className="whitespace-nowrap text-slate-500">
                    {m.contactoAt ? fechaHora(m.contactoAt) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Paginacion pagina={pagina} paginas={paginas} base="/admin/matching" params={{ etapa }} />
    </div>
  )
}
