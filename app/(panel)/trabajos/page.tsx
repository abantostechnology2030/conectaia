import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { Encabezado } from '@/components/Encabezado'
import { Vacio } from '@/components/Vacio'
import { Chip } from '@/components/Chip'
import { Avatar } from '@/components/Avatar'
import { TRABAJO } from '@/lib/estados'
import { soles, hace } from '@/lib/fechas'

export const dynamic = 'force-dynamic'

// Todos los trabajos en los que participo, de los dos lados.
export default async function MisTrabajos() {
  const session = await auth()
  const usuarioId = Number(session!.user.id)

  const trabajos = await prisma.trabajo.findMany({
    where: { OR: [{ solicitanteId: usuarioId }, { proveedorId: usuarioId }] },
    include: {
      necesidad: { select: { id: true, titulo: true, ciudad: true } },
      solicitante: { select: { id: true, nombres: true, apellidos: true, fotoUrl: true } },
      proveedor: { select: { id: true, nombres: true, apellidos: true, fotoUrl: true } },
      calificaciones: { select: { autorId: true } },
    },
    orderBy: [{ createdAt: 'desc' }],
  })

  return (
    <div className="space-y-6">
      <Encabezado
        titulo="Mis trabajos"
        subtitulo="Los trabajos que has contratado y los que has realizado"
        icono="trabajo"
      />

      {trabajos.length === 0 ? (
        <Vacio
          emoji="🤝"
          titulo="Todavía no tienes trabajos"
          mensaje="Un trabajo nace cuando aceptas una oferta o cuando alguien acepta la tuya."
          accion={{ href: '/oportunidades', label: 'Ver oportunidades' }}
        />
      ) : (
        <div className="space-y-4">
          {trabajos.map((t) => {
            const soySolicitante = t.solicitanteId === usuarioId
            const otra = soySolicitante ? t.proveedor : t.solicitante
            const nombreOtra = `${otra.nombres} ${otra.apellidos}`.trim()
            const yaCalifique = t.calificaciones.some((c) => c.autorId === usuarioId)
            const faltaCalificar = t.estado === 'finalizado' && !yaCalifique

            return (
              <Link key={t.id} href={`/trabajos/${t.id}`} className="tarjeta block">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip {...TRABAJO[t.estado]} />
                      <span
                        className={`chip ${
                          soySolicitante
                            ? 'border-cielo-300 bg-cielo-50 text-cielo-700'
                            : 'border-menta-300 bg-menta-50 text-menta-700'
                        }`}
                      >
                        {soySolicitante ? '🔎 Lo contraté' : '🛠️ Lo realicé'}
                      </span>
                      {faltaCalificar && (
                        <span className="chip border-sol-300 bg-sol-50 text-sol-700">
                          ⭐ Te falta calificar
                        </span>
                      )}
                    </div>

                    <h2 className="mt-2 font-bold text-slate-800">{t.necesidad.titulo}</h2>

                    <div className="mt-2 flex items-center gap-2">
                      <Avatar src={otra.fotoUrl} nombre={nombreOtra} tam={28} />
                      <span className="text-sm text-slate-600">
                        {soySolicitante ? 'Realizado por' : 'Para'} <strong>{nombreOtra}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Acordado</p>
                    <p className="text-2xl font-extrabold text-marca-700">{soles(t.precioAcordado)}</p>
                    <p className="mt-1 text-xs text-slate-400">{hace(t.createdAt)}</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
