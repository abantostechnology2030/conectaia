'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useConfirmar } from '@/components/Confirmar'

/**
 * La decisión de quien NECESITA un servicio ante un profesional compatible.
 *
 * Es el espejo del botón "Contactar ahora" del proveedor: cuesta 1 crédito,
 * desbloquea el contacto en los dos sentidos y **no contrata nada** (PDR §22).
 * Aquí no hay un equivalente gratis a "postularme" — quien pide no se postula a
 * sí mismo; su camino sin coste es esperar a que el profesional le mande una
 * oferta, y eso ya ocurre solo.
 *
 * El coste va escrito en el propio botón y se repite en el diálogo, como exige
 * el PDR §13. Sin las dos cosas, el crédito se gasta por sorpresa.
 */
export default function AccionesServicio({
  matchId,
  servicioNombre,
  profesional,
  creditos,
  costo,
  yaContactado,
}: {
  matchId: number
  servicioNombre: string
  profesional: string
  creditos: number
  costo: number
  yaContactado: boolean
}) {
  const router = useRouter()
  const { confirmar, dialogo } = useConfirmar()
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const sinSaldo = creditos < costo

  async function contactar() {
    setError('')

    if (sinSaldo) {
      setError(
        `Necesitas ${costo} crédito(s) para desbloquear este contacto y tienes ${creditos}. Recarga para continuar.`,
      )
      return
    }

    const ok = await confirmar({
      titulo: '¿Desbloquear el contacto?',
      mensaje: `Se consumirá ${costo} crédito y verás los datos de contacto de ${profesional} para coordinar el trabajo. ${profesional} no pagará nada por este mismo contacto y también verá los tuyos.`,
      detalle: servicioNombre,
      advertencia: `Se consumirá ${costo} crédito. Desbloquear no crea una contratación ni obliga a nadie: solo abre el canal para que puedan hablar.`,
      tono: 'credito',
      botonConfirmar: 'Sí, desbloquear contacto',
    })
    if (!ok) return

    setOcupado(true)
    const r = await fetch(`/api/oportunidades/${matchId}/contactar`, { method: 'POST' })
    const j = await r.json().catch(() => ({}))
    setOcupado(false)

    if (!r.ok) {
      setError(j.error ?? 'No se pudo desbloquear el contacto.')
      return
    }
    router.refresh()
  }

  if (yaContactado) {
    return (
      <p className="text-sm text-slate-600">
        Ya tienes el contacto de {profesional} desbloqueado. Lo encuentras aquí al lado.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}

      <button type="button" disabled={ocupado} onClick={contactar} className="btn-primario">
        {ocupado ? 'Desbloqueando…' : `Contactar a ${profesional} · ${costo} crédito`}
      </button>

      <p className="text-xs text-slate-500">
        También puedes no gastar nada y esperar: {profesional} ve tu necesidad entre sus
        oportunidades y puede enviarte una oferta. Si te llega y la aceptas, el crédito se cobra
        entonces.
      </p>

      {sinSaldo && (
        <p className="rounded-xl border border-sol-300 bg-sol-50 px-4 py-2.5 text-sm text-sol-700">
          Tienes {creditos} crédito(s).{' '}
          <Link href="/creditos" className="font-bold underline">
            Recargar
          </Link>
        </p>
      )}

      {dialogo}
    </div>
  )
}
