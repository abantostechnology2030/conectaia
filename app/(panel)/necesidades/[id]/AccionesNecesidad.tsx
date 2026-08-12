'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useConfirmar } from '@/components/Confirmar'
import { editable } from '@/lib/estados'

// Botones de estado de una necesidad: publicar, despublicar, cancelar,
// reactivar y eliminar. Las transiciones válidas las decide el servidor
// (app/api/necesidades/[id]/estado); aquí solo se muestran las que aplican.
export default function AccionesNecesidad({
  id,
  titulo,
  estado,
  tienePostulaciones,
}: {
  id: number
  titulo: string
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
    const r = await fetch(`/api/necesidades/${id}/estado`, {
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
      titulo: '¿Eliminar esta necesidad?',
      mensaje: 'Se borrará junto con sus fotos. No se puede deshacer.',
      detalle: titulo,
      tono: 'peligro',
    })
    if (!ok) return

    setOcupado(true)
    const r = await fetch(`/api/necesidades/${id}`, { method: 'DELETE' })
    const j = await r.json().catch(() => ({}))
    setOcupado(false)

    if (!r.ok) {
      setError(j.error ?? 'No se pudo eliminar.')
      return
    }
    router.push('/necesidades')
    router.refresh()
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {editable(estado) && (
          <Link href={`/necesidades/${id}/editar`} className="btn-secundario">
            Editar
          </Link>
        )}

        {estado === 'borrador' && (
          <button type="button" disabled={ocupado} onClick={() => cambiar('publicada')} className="btn-cielo">
            Publicar
          </button>
        )}

        {estado === 'publicada' && (
          <button
            type="button"
            disabled={ocupado}
            onClick={() =>
              cambiar('borrador', {
                titulo: '¿Dejar de recibir ofertas?',
                mensaje: 'La necesidad volverá a borrador y dejará de aparecer para los demás.',
                detalle: titulo,
                tono: 'aviso',
                botonConfirmar: 'Sí, despublicar',
              })
            }
            className="btn-secundario"
          >
            Despublicar
          </button>
        )}

        {estado === 'cancelada' && (
          <button type="button" disabled={ocupado} onClick={() => cambiar('publicada')} className="btn-cielo">
            Volver a publicar
          </button>
        )}

        {(estado === 'borrador' || estado === 'publicada') && (
          <button
            type="button"
            disabled={ocupado}
            onClick={() =>
              cambiar('cancelada', {
                titulo: '¿Cancelar esta necesidad?',
                mensaje:
                  'Dejará de recibir ofertas y se avisará a quienes ya se habían postulado. No se consume ningún crédito.',
                detalle: titulo,
                tono: 'peligro',
                botonConfirmar: 'Sí, cancelar',
              })
            }
            className="btn-peligro"
          >
            Cancelar necesidad
          </button>
        )}

        {estado === 'oferta_seleccionada' && (
          <button type="button" disabled={ocupado} onClick={() => cambiar('en_proceso')} className="btn-primario">
            Marcar como iniciado
          </button>
        )}

        {estado === 'borrador' && !tienePostulaciones && (
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
