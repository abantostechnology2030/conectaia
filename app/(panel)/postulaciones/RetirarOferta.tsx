'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useConfirmar } from '@/components/Confirmar'

export default function RetirarOferta({ id, titulo }: { id: number; titulo: string }) {
  const router = useRouter()
  const { confirmar, dialogo } = useConfirmar()
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')

  async function retirar() {
    const ok = await confirmar({
      titulo: '¿Retirar tu oferta?',
      mensaje: 'Dejará de estar en juego para esta necesidad. No podrás volver a postularte.',
      detalle: titulo,
      tono: 'peligro',
      botonConfirmar: 'Sí, retirar',
    })
    if (!ok) return

    setOcupado(true)
    const r = await fetch(`/api/postulaciones/${id}`, { method: 'DELETE' })
    const j = await r.json().catch(() => ({}))
    setOcupado(false)

    if (!r.ok) {
      setError(j.error ?? 'No se pudo retirar.')
      return
    }
    router.refresh()
  }

  return (
    <>
      <button type="button" disabled={ocupado} onClick={retirar} className="btn-secundario">
        Retirar
      </button>
      {error && <span className="text-xs font-semibold text-rose-600">{error}</span>}
      {dialogo}
    </>
  )
}
