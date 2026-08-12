'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type Paquete = { id: number; nombre: string; creditos: number; precio: number }

/**
 * Recarga por Yape con comprobante (PDR §29).
 *
 * El pago es manual y fuera de la app: el usuario yapea, sube la captura y el
 * administrador aprueba. Los créditos NO se acreditan aquí — eso ocurre solo
 * cuando el admin aprueba, en /api/admin/recargas/[id].
 */
export default function RecargaForm({
  paquetes,
  yapeNumero,
  yapeTitular,
  yapeQr,
  hayPendiente,
}: {
  paquetes: Paquete[]
  yapeNumero: string
  yapeTitular: string
  yapeQr: string
  hayPendiente: boolean
}) {
  const router = useRouter()
  const [elegido, setElegido] = useState<Paquete | null>(null)
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setOcupado(true)

    const datos = new FormData(e.currentTarget)
    const r = await fetch('/api/recargas', { method: 'POST', body: datos })
    const j = await r.json().catch(() => ({}))
    setOcupado(false)

    if (!r.ok) {
      setError(j.error ?? 'No se pudo registrar la recarga.')
      return
    }

    setElegido(null)
    router.refresh()
  }

  if (hayPendiente) {
    return (
      <div className="tarjeta border-sol-300 bg-sol-50">
        <h2 className="font-bold text-sol-800">Tienes una recarga en revisión</h2>
        <p className="mt-1 text-sm text-sol-700">
          El administrador está revisando tu comprobante. En cuanto la apruebe, los créditos se
          acreditarán automáticamente y te avisaremos.
        </p>
      </div>
    )
  }

  if (paquetes.length === 0) {
    return (
      <div className="tarjeta">
        <p className="text-sm text-slate-600">
          No hay paquetes de créditos disponibles en este momento.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-bold text-slate-700">1. Elige un paquete</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {paquetes.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setElegido(p)}
              className={`rounded-2xl border-2 p-4 text-left transition ${
                elegido?.id === p.id
                  ? 'border-marca-500 bg-marca-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-marca-300'
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{p.nombre}</p>
              <p className="mt-1 text-3xl font-extrabold text-marca-700">{p.creditos}</p>
              <p className="text-xs text-slate-500">créditos</p>
              <p className="mt-2 text-lg font-bold text-slate-800">S/ {p.precio.toFixed(2)}</p>
              <p className="text-xs text-slate-400">
                S/ {(p.precio / p.creditos).toFixed(2)} por crédito
              </p>
            </button>
          ))}
        </div>
      </div>

      {elegido && (
        <>
          <div className="tarjeta">
            <h2 className="font-bold text-slate-700">2. Paga por Yape</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-slate-600">Yapea exactamente este monto:</p>
                <p className="mt-1 text-3xl font-extrabold text-marca-700">
                  S/ {elegido.precio.toFixed(2)}
                </p>
                <dl className="mt-4 space-y-1.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Número</dt>
                    <dd className="font-bold text-slate-800">{yapeNumero}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">A nombre de</dt>
                    <dd className="font-bold text-slate-800">{yapeTitular}</dd>
                  </div>
                </dl>
              </div>

              {yapeQr && (
                <div className="grid place-items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={yapeQr}
                    alt="Código QR de Yape"
                    className="max-h-52 rounded-xl border border-slate-200 object-contain"
                  />
                </div>
              )}
            </div>
          </div>

          <form onSubmit={enviar} className="tarjeta space-y-4">
            <h2 className="font-bold text-slate-700">3. Registra tu pago</h2>
            <input type="hidden" name="paqueteId" value={elegido.id} />

            <div>
              <label className="etiqueta" htmlFor="operacion">
                Número de operación
              </label>
              <input id="operacion" name="operacion" className="campo" placeholder="Opcional" />
              <p className="ayuda">Ayuda al administrador a encontrar tu pago más rápido.</p>
            </div>

            <div>
              <label className="etiqueta" htmlFor="comprobante">
                Captura del pago <span className="text-rose-500">*</span>
              </label>
              <input
                id="comprobante"
                name="comprobante"
                type="file"
                required
                accept="image/jpeg,image/png,image/webp"
                className="campo"
              />
              <p className="ayuda">JPG, PNG o WEBP · hasta 5 MB.</p>
            </div>

            {error && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">
                {error}
              </p>
            )}

            <button type="submit" disabled={ocupado} className="btn-primario w-full">
              {ocupado ? 'Enviando…' : `Registrar recarga de ${elegido.creditos} créditos`}
            </button>
            <p className="text-center text-xs text-slate-500">
              Tu recarga quedará pendiente hasta que el administrador verifique el pago.
            </p>
          </form>
        </>
      )}
    </div>
  )
}
