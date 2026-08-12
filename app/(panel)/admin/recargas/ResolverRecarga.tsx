'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useConfirmar } from '@/components/Confirmar'

// Aprobar o rechazar una recarga (PDR §29). Aprobar es lo único que acredita
// créditos por compra, así que va siempre con confirmación.
export default function ResolverRecarga({
  id,
  usuario,
  creditos,
  monto,
}: {
  id: number
  usuario: string
  creditos: number
  monto: number
}) {
  const router = useRouter()
  const { confirmar, dialogo } = useConfirmar()
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [nota, setNota] = useState('')

  async function resolver(estado: 'aprobada' | 'rechazada') {
    setError('')

    if (estado === 'rechazada' && nota.trim().length < 5) {
      setError('Escribe el motivo del rechazo: el usuario lo verá y necesita saber qué corregir.')
      return
    }

    const ok = await confirmar(
      estado === 'aprobada'
        ? {
            titulo: '¿Aprobar esta recarga?',
            mensaje: 'Se acreditarán los créditos de inmediato y se avisará al usuario.',
            detalle: `${usuario} · ${creditos} créditos · S/ ${monto.toFixed(2)}`,
            advertencia: 'Verifica antes que el pago haya llegado realmente.',
            tono: 'credito',
            botonConfirmar: 'Sí, aprobar y acreditar',
          }
        : {
            titulo: '¿Rechazar esta recarga?',
            mensaje: 'No se acreditará ningún crédito y se avisará al usuario con tu motivo.',
            detalle: `${usuario} · S/ ${monto.toFixed(2)}`,
            tono: 'peligro',
            botonConfirmar: 'Sí, rechazar',
          },
    )
    if (!ok) return

    setOcupado(true)
    const r = await fetch(`/api/admin/recargas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado, notaAdmin: nota }),
    })
    const j = await r.json().catch(() => ({}))
    setOcupado(false)

    if (!r.ok) {
      setError(j.error ?? 'No se pudo resolver.')
      return
    }
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="etiqueta" htmlFor={`nota-${id}`}>
          Nota para el usuario
        </label>
        <input
          id={`nota-${id}`}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          className="campo"
          placeholder="Obligatoria si rechazas"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={ocupado} onClick={() => resolver('aprobada')} className="btn-menta">
          Aprobar y acreditar {creditos} créditos
        </button>
        <button type="button" disabled={ocupado} onClick={() => resolver('rechazada')} className="btn-peligro">
          Rechazar
        </button>
      </div>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}

      {dialogo}
    </div>
  )
}
