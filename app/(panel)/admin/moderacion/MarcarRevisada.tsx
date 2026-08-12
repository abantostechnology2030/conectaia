'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function MarcarRevisada({ id, revisada }: { id: number; revisada: boolean }) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState(false)

  async function alternar() {
    setOcupado(true)
    await fetch(`/api/admin/moderacion/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revisada: !revisada }),
    })
    setOcupado(false)
    router.refresh()
  }

  return (
    <button type="button" disabled={ocupado} onClick={alternar} className="btn-secundario shrink-0">
      {revisada ? 'Marcar sin revisar' : 'Marcar revisada'}
    </button>
  )
}
