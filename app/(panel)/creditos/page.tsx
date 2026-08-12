import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { Encabezado } from '@/components/Encabezado'
import { Stat } from '@/components/Stat'
import { Chip } from '@/components/Chip'
import { RECARGA } from '@/lib/estados'
import { fechaHora, soles } from '@/lib/fechas'
import { ETIQUETA_MOVIMIENTO } from '@/lib/creditos'
import { getConfig } from '@/lib/config'
import RecargaForm from './RecargaForm'

export const dynamic = 'force-dynamic'

export default async function Creditos() {
  const session = await auth()
  const usuarioId = Number(session!.user.id)

  const [yo, paquetes, movimientos, recargas, cfg] = await Promise.all([
    prisma.usuario.findUnique({ where: { id: usuarioId }, select: { creditos: true } }),
    prisma.paqueteCredito.findMany({ where: { activo: true }, orderBy: { orden: 'asc' } }),
    prisma.movimientoCredito.findMany({
      where: { usuarioId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.recarga.findMany({
      where: { usuarioId },
      include: { paquete: { select: { nombre: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    getConfig(),
  ])

  const comprados = movimientos
    .filter((m) => m.tipo === 'recarga')
    .reduce((t, m) => t + m.cantidad, 0)
  const consumidos = movimientos
    .filter((m) => m.tipo === 'consumo')
    .reduce((t, m) => t + Math.abs(m.cantidad), 0)

  const hayPendiente = recargas.some((r) => r.estado === 'pendiente')

  return (
    <div className="space-y-6">
      <Encabezado
        titulo="Mis créditos"
        subtitulo="Un crédito desbloquea un contacto"
        icono="creditos"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat titulo="Saldo disponible" valor={yo?.creditos ?? 0} icono="creditos" tono="marca" />
        <Stat titulo="Créditos comprados" valor={comprados} icono="paquete" tono="menta" />
        <Stat titulo="Contactos desbloqueados" valor={consumidos} icono="match" tono="cielo" />
      </div>

      <div className="rounded-2xl border border-marca-200 bg-marca-50 p-5">
        <h2 className="font-bold text-marca-800">Cómo funcionan los créditos</h2>
        <ul className="mt-2 space-y-1 text-sm text-marca-800">
          <li>· Publicar necesidades y servicios es gratis, y postularte también.</li>
          <li>· Se consume 1 crédito cuando <strong>tú</strong> decides desbloquear un contacto.</li>
          <li>
            · Si aceptas una oferta, pagas tú. Si aceptan la tuya, paga quien la acepta:{' '}
            <strong>nunca se cobra a las dos partes por el mismo contacto</strong>.
          </li>
          <li>· Una vez desbloqueado, ambos ven los datos del otro.</li>
        </ul>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-extrabold text-slate-800">Recargar créditos</h2>
        <RecargaForm
          paquetes={paquetes}
          yapeNumero={cfg.yape_numero}
          yapeTitular={cfg.yape_titular}
          yapeQr={cfg.yape_qr}
          hayPendiente={hayPendiente}
        />
      </section>

      {recargas.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-extrabold text-slate-800">Mis recargas</h2>
          <div className="tarjeta scroll-x">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Paquete</th>
                  <th>Créditos</th>
                  <th>Monto</th>
                  <th>Estado</th>
                  <th>Nota</th>
                </tr>
              </thead>
              <tbody>
                {recargas.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap text-slate-500">{fechaHora(r.createdAt)}</td>
                    <td className="font-semibold">{r.paquete.nombre}</td>
                    <td>{r.creditos}</td>
                    <td>{soles(r.monto)}</td>
                    <td>
                      <Chip {...RECARGA[r.estado]} />
                    </td>
                    <td className="text-slate-500">{r.notaAdmin ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-extrabold text-slate-800">Historial de movimientos</h2>
        {movimientos.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
            Todavía no hay movimientos en tu cuenta.
          </p>
        ) : (
          <div className="tarjeta scroll-x">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Detalle</th>
                  <th className="text-right">Créditos</th>
                  <th className="text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m) => (
                  <tr key={m.id}>
                    <td className="whitespace-nowrap text-slate-500">{fechaHora(m.createdAt)}</td>
                    <td>
                      <span
                        className={`chip ${
                          m.cantidad > 0
                            ? 'border-menta-300 bg-menta-50 text-menta-700'
                            : 'border-rose-200 bg-rose-50 text-rose-700'
                        }`}
                      >
                        {ETIQUETA_MOVIMIENTO[m.tipo] ?? m.tipo}
                      </span>
                    </td>
                    <td>{m.motivo}</td>
                    <td
                      className={`text-right font-extrabold ${
                        m.cantidad > 0 ? 'text-menta-700' : 'text-rose-600'
                      }`}
                    >
                      {m.cantidad > 0 ? '+' : ''}
                      {m.cantidad}
                    </td>
                    <td className="text-right font-semibold text-slate-600">{m.saldoDespues}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
