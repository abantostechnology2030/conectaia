'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function MarcarLeidas() {
  const router = useRouter()
  const [ocupado, setOcupado] = useState(false)

  async function marcar() {
    setOcupado(true)
    await fetch('/api/notificaciones', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    setOcupado(false)
    router.refresh()
  }

  return (
    <button type="button" disabled={ocupado} onClick={marcar} className="btn-secundario">
      {ocupado ? 'Marcando…' : 'Marcar todas como leídas'}
    </button>
  )
}
