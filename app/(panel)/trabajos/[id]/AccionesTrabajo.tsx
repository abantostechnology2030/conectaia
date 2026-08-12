'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useConfirmar } from '@/components/Confirmar'
import { SelectorEstrellas } from '@/components/Estrellas'

/**
 * Cerrar el trabajo y calificar (PDR §26-27).
 *
 * El formulario de calificación solo aparece cuando el trabajo está
 * FINALIZADO y esta persona todavía no calificó: son las dos condiciones que
 * la API vuelve a exigir, aquí solo se evita ofrecer algo que iba a fallar.
 */
export default function AccionesTrabajo({
  id,
  titulo,
  estado,
  yaCalifique,
  nombreOtra,
}: {
  id: number
  titulo: string
  estado: string
  yaCalifique: boolean
  nombreOtra: string
}) {
  const router = useRouter()
  const { confirmar, dialogo } = useConfirmar()
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [estrellas, setEstrellas] = useState(0)

  async function cerrar(nuevo: 'finalizado' | 'cancelado') {
    setError('')
    const ok = await confirmar(
      nuevo === 'finalizado'
        ? {
            titulo: '¿Marcar el trabajo como finalizado?',
            mensaje: 'Se avisará a la otra persona y ambos podrán calificarse.',
            detalle: titulo,
            tono: 'aviso',
            botonConfirmar: 'Sí, está finalizado',
          }
        : {
            titulo: '¿Cancelar este trabajo?',
            mensaje:
              'El trabajo quedará como cancelado y nadie podrá calificar. El crédito ya consumido no se devuelve automáticamente; si crees que corresponde una devolución, escribe al administrador.',
            detalle: titulo,
            tono: 'peligro',
            botonConfirmar: 'Sí, cancelar',
          },
    )
    if (!ok) return

    setOcupado(true)
    const r = await fetch(`/api/trabajos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevo }),
    })
    const j = await r.json().catch(() => ({}))
    setOcupado(false)

    if (!r.ok) {
      setError(j.error ?? 'No se pudo actualizar el trabajo.')
      return
    }
    router.refresh()
  }

  async function calificar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (estrellas < 1) {
      setError('Elige de 1 a 5 estrellas.')
      return
    }

    const d = new FormData(e.currentTarget)
    setOcupado(true)
    const r = await fetch('/api/calificaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trabajoId: id, estrellas, comentario: d.get('comentario') }),
    })
    const j = await r.json().catch(() => ({}))
    setOcupado(false)

    if (!r.ok) {
      setError(j.error ?? 'No se pudo enviar la calificación.')
      return
    }
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="whitespace-pre-line rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}

      {estado === 'en_proceso' && (
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={ocupado} onClick={() => cerrar('finalizado')} className="btn-menta">
            Marcar como finalizado
          </button>
          <button type="button" disabled={ocupado} onClick={() => cerrar('cancelado')} className="btn-peligro">
            Cancelar trabajo
          </button>
        </div>
      )}

      {estado === 'finalizado' && !yaCalifique && (
        <form onSubmit={calificar} className="rounded-2xl border border-sol-300 bg-sol-50 p-5">
          <h3 className="font-bold text-slate-800">¿Cómo te fue con {nombreOtra}?</h3>
          <p className="mt-1 text-sm text-slate-600">
            Tu calificación ayuda a los demás a decidir. Solo puedes calificar una vez.
          </p>

          <div className="mt-3">
            <SelectorEstrellas valor={estrellas} alCambiar={setEstrellas} />
          </div>

          <div className="mt-3">
            <label className="etiqueta" htmlFor="comentario">
              Comentario
            </label>
            <textarea
              id="comentario"
              name="comentario"
              rows={3}
              className="campo"
              placeholder="Cuenta cómo fue el trabajo: puntualidad, calidad, trato…"
            />
          </div>

          <button type="submit" disabled={ocupado} className="btn-primario mt-3">
            {ocupado ? 'Enviando…' : 'Enviar calificación'}
          </button>
        </form>
      )}

      {estado === 'finalizado' && yaCalifique && (
        <p className="rounded-xl border border-menta-300 bg-menta-50 px-4 py-3 text-sm font-semibold text-menta-700">
          ✅ Ya calificaste este trabajo. Gracias.
        </p>
      )}

      {dialogo}
    </div>
  )
}
