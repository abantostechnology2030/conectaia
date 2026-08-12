'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useConfirmar } from '@/components/Confirmar'

// Publicar, pausar, reactivar, desactivar y eliminar un servicio (PDR §36).
export default function AccionesServicio({
  id,
  nombre,
  estado,
  tienePostulaciones,
}: {
  id: number
  nombre: string
  estado: string
  tienePostulaciones: boolean
}) {
  const router = useRouter()
  const { confirmar, dialogo } = useConfirmar()
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)

  async function cambiar(nuevo: string, pregunta?: Parameters<typeof confirmar>[0]) {
    setError('')
    if (pregunta && !(await confirmar(pregunta))) return

    setOcupado(true)
    const r = await fetch(`/api/servicios/${id}/estado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevo }),
    })
    const j = await r.json().catch(() => ({}))
    setOcupado(false)

    if (!r.ok) {
      setError(j.error ?? 'No se pudo cambiar el estado.')
      return
    }
    router.refresh()
  }

  async function eliminar() {
    setError('')
    const ok = await confirmar({
      titulo: '¿Eliminar este servicio?',
      mensaje: 'Se borrará junto con sus fotos. No se puede deshacer.',
      detalle: nombre,
      tono: 'peligro',
    })
    if (!ok) return

    setOcupado(true)
    const r = await fetch(`/api/servicios/${id}`, { method: 'DELETE' })
    const j = await r.json().catch(() => ({}))
    setOcupado(false)

    if (!r.ok) {
      setError(j.error ?? 'No se pudo eliminar.')
      return
    }
    router.push('/servicios')
    router.refresh()
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Link href={`/servicios/${id}/editar`} className="btn-secundario">
          Editar
        </Link>

        {(estado === 'borrador' || estado === 'pausado' || estado === 'desactivado') && (
          <button type="button" disabled={ocupado} onClick={() => cambiar('publicado')} className="btn-menta">
            {estado === 'pausado' ? 'Reactivar' : 'Publicar'}
          </button>
        )}

        {estado === 'publicado' && (
          <button
            type="button"
            disabled={ocupado}
            onClick={() =>
              cambiar('pausado', {
                titulo: '¿Pausar este servicio?',
                mensaje:
                  'Dejarás de recibir oportunidades temporalmente. El servicio y su historial se conservan, y puedes reactivarlo cuando quieras.',
                detalle: nombre,
                tono: 'aviso',
                botonConfirmar: 'Sí, pausar',
              })
            }
            className="btn-secundario"
          >
            Pausar
          </button>
        )}

        {estado !== 'desactivado' && (
          <button
            type="button"
            disabled={ocupado}
            onClick={() =>
              cambiar('desactivado', {
                titulo: '¿Desactivar este servicio?',
                mensaje: 'Dejará de aparecer en las búsquedas y en las oportunidades de los demás.',
                detalle: nombre,
                tono: 'peligro',
                botonConfirmar: 'Sí, desactivar',
              })
            }
            className="btn-peligro"
          >
            Desactivar
          </button>
        )}

        {!tienePostulaciones && (
          <button type="button" disabled={ocupado} onClick={eliminar} className="btn-peligro">
            Eliminar
          </button>
        )}
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
