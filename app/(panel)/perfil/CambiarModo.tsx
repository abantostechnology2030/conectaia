'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useConfirmar } from '@/components/Confirmar'
// Desde '@/lib/lados', que no toca el servidor. Ver el aviso de lib/modos.ts.
import { ETIQUETA_MODO, type Modo } from '@/lib/lados'

// Los dos lados que hay, y no más. No existe un "las dos cosas": se está en uno
// o en el otro y se cambia cuando haga falta, aquí o con los dos botones que el
// panel tiene siempre abajo.
const OPCIONES: { modo: Modo; emoji: string; texto: string }[] = [
  { modo: 'busco', emoji: '🔎', texto: 'Quiero contratar servicios' },
  { modo: 'ofrezco', emoji: '🛠️', texto: 'Quiero ofrecer mis servicios' },
]

/**
 * Cambiar el lado activo desde el perfil.
 *
 * Es el mismo cambio que hacen los dos botones del panel; aquí se deja porque es
 * donde la gente busca los ajustes de su cuenta. Cambiar de lado NO borra nada:
 * las publicaciones siguen ahí y reaparecen al volver. Se dice explícitamente
 * porque, si no, el usuario supone que va a perder lo que tenía y no lo toca.
 */
export default function CambiarModo({ modo }: { modo: string | null }) {
  const router = useRouter()
  const { confirmar, dialogo } = useConfirmar()
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)

  async function cambiar(nuevo: Modo) {
    if (nuevo === modo) return
    setError('')

    const ok = await confirmar({
      titulo: '¿Cambiar de lado?',
      mensaje:
        'Verás las opciones del otro lado en el menú. Tus publicaciones NO se borran ni se despublican: cuando vuelvas, las encontrarás tal como las dejaste.',
      detalle: `Pasarás a: ${ETIQUETA_MODO[nuevo]}`,
      tono: 'aviso',
      botonConfirmar: 'Sí, cambiar',
    })
    if (!ok) return

    setOcupado(true)
    const r = await fetch('/api/perfil/modo', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modo: nuevo }),
    })
    const j = await r.json().catch(() => ({}))
    setOcupado(false)

    if (!r.ok) {
      setError(j.error ?? 'No se pudo cambiar.')
      return
    }
    router.push('/panel')
    router.refresh()
  }

  return (
    <div className="tarjeta">
      <h2 className="font-bold text-slate-700">¿Qué quieres hacer en ConectaIA?</h2>
      <p className="mt-1 text-sm text-slate-500">
        Decide qué opciones te mostramos. Es la misma cuenta: cambiar esto no borra nada.
      </p>

      <div className="mt-4 space-y-2">
        {OPCIONES.map((o) => {
          const activa = modo === o.modo
          return (
            <button
              key={o.modo}
              type="button"
              disabled={ocupado}
              onClick={() => cambiar(o.modo)}
              className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition ${
                activa
                  ? 'border-marca-500 bg-marca-50'
                  : 'border-slate-200 bg-white hover:border-marca-300'
              }`}
            >
              <span className="text-2xl" aria-hidden="true">
                {o.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-slate-800">{ETIQUETA_MODO[o.modo]}</span>
                <span className="block text-sm text-slate-500">{o.texto}</span>
              </span>
              {activa && <span className="chip border-marca-300 bg-white text-marca-700">Activo</span>}
            </button>
          )
        })}
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}

      {dialogo}
    </div>
  )
}
