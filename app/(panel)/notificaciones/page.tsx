import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { Encabezado } from '@/components/Encabezado'
import { Vacio } from '@/components/Vacio'
import { ICONO_NOTIFICACION } from '@/lib/notificaciones'
import { hace } from '@/lib/fechas'
import MarcarLeidas from './MarcarLeidas'

export const dynamic = 'force-dynamic'

export default async function Notificaciones() {
  const session = await auth()
  const usuarioId = Number(session!.user.id)

  const notificaciones = await prisma.notificacion.findMany({
    where: { usuarioId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const sinLeer = notificaciones.filter((n) => !n.leida).length

  return (
    <div className="space-y-6">
      <Encabezado
        titulo="Notificaciones"
        subtitulo={sinLeer > 0 ? `${sinLeer} sin leer` : 'Todo al día'}
        icono="campana"
      >
        {sinLeer > 0 && <MarcarLeidas />}
      </Encabezado>

      {notificaciones.length === 0 ? (
        <Vacio
          emoji="🔔"
          titulo="No tienes notificaciones"
          mensaje="Te avisaremos cuando recibas una oferta, aparezca una coincidencia o se apruebe una recarga."
        />
      ) : (
        <div className="tarjeta divide-y divide-slate-100">
          {notificaciones.map((n) => (
            <Link
              key={n.id}
              href={n.url ?? '/panel'}
              className={`-mx-2 flex items-start gap-3 rounded-xl px-2 py-3.5 transition hover:bg-slate-50 ${
                n.leida ? '' : 'bg-marca-50/40'
              }`}
            >
              <span className="text-xl">{ICONO_NOTIFICACION[n.tipo] ?? '🔔'}</span>
              <div className="min-w-0 flex-1">
                <p className={`${n.leida ? 'font-semibold' : 'font-bold'} text-slate-800`}>
                  {n.titulo}
                </p>
                <p className="text-sm text-slate-600">{n.mensaje}</p>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-xs text-slate-400">{hace(n.createdAt)}</span>
                {!n.leida && <span className="mt-1 block h-2 w-2 rounded-full bg-marca-500" />}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
