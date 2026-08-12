import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Encabezado } from '@/components/Encabezado'
import { Vacio } from '@/components/Vacio'
import { Paginacion } from '@/components/Paginacion'
import { fechaHora } from '@/lib/fechas'
import { getConfig, esSi } from '@/lib/config'
import MarcarRevisada from './MarcarRevisada'

export const dynamic = 'force-dynamic'

const POR_PAGINA = 25

const ORIGEN: Record<string, string> = {
  necesidad: 'Una necesidad',
  servicio: 'Un servicio',
  postulacion: 'Una oferta',
  perfil: 'Su perfil',
  calificacion: 'Una calificación',
}

// Alertas de evasión del sistema de créditos (PDR §24, §41).
export default async function AdminModeracion({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; p?: string }>
}) {
  const sp = await searchParams
  const estado = sp.estado ?? 'pendientes'

  const donde = estado === 'todas' ? {} : { revisada: false }
  const [total, cfg] = await Promise.all([
    prisma.alertaModeracion.count({ where: donde }),
    getConfig(),
  ])

  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA))
  const pagina = Math.min(Math.max(1, Number(sp.p) || 1), paginas)

  const alertas = await prisma.alertaModeracion.findMany({
    where: donde,
    include: { usuario: { select: { id: true, nombres: true, apellidos: true, estado: true } } },
    orderBy: { createdAt: 'desc' },
    skip: (pagina - 1) * POR_PAGINA,
    take: POR_PAGINA,
  })

  const bloquea = esSi(cfg.antievasion_bloquea)

  return (
    <div className="space-y-6">
      <Encabezado
        titulo="Moderación"
        subtitulo={`${total} alerta(s)`}
        icono="alerta"
      />

      <div
        className={`rounded-2xl border p-5 ${
          bloquea ? 'border-menta-300 bg-menta-50' : 'border-sol-300 bg-sol-50'
        }`}
      >
        <h2 className={`font-bold ${bloquea ? 'text-menta-800' : 'text-sol-800'}`}>
          {bloquea ? '🛡️ La detección está bloqueando' : '⚠️ La detección está solo avisando'}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {bloquea
            ? 'Cuando un texto incluye datos de contacto, no se publica y el usuario ve por qué. La alerta queda registrada aquí.'
            : 'Los textos con datos de contacto SÍ se publican; solo queda la alerta. Cámbialo en la configuración si quieres bloquear.'}{' '}
          <Link href="/admin/configuracion" className="font-semibold underline">
            Ir a la configuración
          </Link>
        </p>
      </div>

      <div className="flex gap-2">
        {[
          { id: 'pendientes', label: 'Sin revisar' },
          { id: 'todas', label: 'Todas' },
        ].map((f) => (
          <Link
            key={f.id}
            href={`/admin/moderacion?estado=${f.id}`}
            className={`chip ${
              estado === f.id
                ? 'border-marca-500 bg-marca-500 text-white'
                : 'border-slate-300 bg-white text-slate-600'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {alertas.length === 0 ? (
        <Vacio
          emoji="🛡️"
          titulo="No hay alertas pendientes"
          mensaje="Nadie ha intentado publicar datos de contacto para saltarse el sistema de créditos."
        />
      ) : (
        <div className="space-y-3">
          {alertas.map((a) => (
            <article
              key={a.id}
              className={`tarjeta ${a.revisada ? '' : 'border-rose-200 bg-rose-50/40'}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="chip border-rose-200 bg-rose-50 text-rose-700">{a.detalle}</span>
                    <span className="chip border-slate-200 bg-slate-50 text-slate-600">
                      {ORIGEN[a.origen] ?? a.origen}
                    </span>
                    {a.usuario.estado === 'suspendido' && (
                      <span className="chip border-slate-300 bg-slate-100 text-slate-600">
                        Cuenta suspendida
                      </span>
                    )}
                    {a.revisada && (
                      <span className="chip border-menta-300 bg-menta-50 text-menta-700">Revisada</span>
                    )}
                  </div>

                  <p className="mt-2 text-sm">
                    <Link href={`/u/${a.usuario.id}`} className="font-bold text-slate-800 hover:underline">
                      {a.usuario.nombres} {a.usuario.apellidos}
                    </Link>
                    <span className="text-slate-500"> · {fechaHora(a.createdAt)}</span>
                  </p>
                </div>

                <MarcarRevisada id={a.id} revisada={a.revisada} />
              </div>

              <blockquote className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm whitespace-pre-line text-slate-700">
                {a.texto}
              </blockquote>
            </article>
          ))}
        </div>
      )}

      <Paginacion pagina={pagina} paginas={paginas} base="/admin/moderacion" params={{ estado }} />
    </div>
  )
}
