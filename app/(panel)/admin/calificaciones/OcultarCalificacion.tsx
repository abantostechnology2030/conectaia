'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useConfirmar } from '@/components/Confirmar'

export default function OcultarCalificacion({ id, oculta }: { id: number; oculta: boolean }) {
  const router = useRouter()
  const { confirmar, dialogo } = useConfirmar()
  const [ocupado, setOcupado] = useState(false)

  async function alternar() {
    if (!oculta) {
      const ok = await confirmar({
        titulo: '¿Ocultar esta calificación?',
        mensaje:
          'Dejará de aparecer en el perfil público y de contar para la reputación. La fila se conserva para poder auditarla.',
        tono: 'peligro',
        botonConfirmar: 'Sí, ocultar',
      })
      if (!ok) return
    }

    setOcupado(true)
    await fetch(`/api/admin/calificaciones/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oculta: !oculta }),
    })
    setOcupado(false)
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        disabled={ocupado}
        onClick={alternar}
        className={oculta ? 'btn-secundario shrink-0' : 'btn-peligro shrink-0'}
      >
        {oculta ? 'Restaurar' : 'Ocultar'}
      </button>
      {dialogo}
    </>
  )
}
