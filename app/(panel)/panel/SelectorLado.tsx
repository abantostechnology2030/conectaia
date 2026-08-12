'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
// Desde '@/lib/lados', NO desde '@/lib/modos': ese otro importa Prisma, y
// arrastrarlo hasta aquí impide que este componente llegue a hidratarse — los
// botones se ven bien y no responden al pulsarlos.
import { MODOS, ETIQUETA_MODO, type Modo } from '@/lib/lados'

const LADOS: Record<Modo, { emoji: string; texto: string; activo: string; inactivo: string }> = {
  busco: {
    emoji: '🔎',
    texto: 'Publico lo que busco y recibo ofertas',
    activo: 'border-cielo-500 bg-cielo-50 text-cielo-800',
    inactivo: 'border-slate-200 bg-white text-slate-600 hover:border-cielo-300',
  },
  ofrezco: {
    emoji: '🛠️',
    texto: 'Publico lo que sé hacer y me llegan oportunidades',
    activo: 'border-menta-500 bg-menta-50 text-menta-800',
    inactivo: 'border-slate-200 bg-white text-slate-600 hover:border-menta-300',
  },
}

/**
 * Los dos botones del panel: en qué lado estoy y cómo me paso al otro.
 *
 * Están SIEMPRE los dos, y siempre abajo. No es un aviso que aparece cuando
 * falta algo: es el mando con el que se cambia de lado, y por eso el lado
 * inactivo tiene que verse igual de disponible que el activo. Sin los dos a la
 * vista, el lado que se eligió en la portada el primer día sería para siempre en
 * la práctica.
 *
 * Cambiar de lado NO borra ni despublica nada: las necesidades y los servicios
 * siguen donde estaban y reaparecen al volver. Se dice aquí mismo porque, si no,
 * la gente supone que va a perder su trabajo y no toca el botón.
 */
export default function SelectorLado({
  modo,
  pedido,
}: {
  modo: Modo
  /** Viene de una guarda de ruta: pidió una página del lado que no está activo. */
  pedido?: Modo
}) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState<Modo | null>(null)
  // `router.refresh()` vuelve a pedir la página al servidor pero NO desmonta
  // este componente, así que hay que saber cuándo termina para soltar los
  // botones. `useTransition` es lo que lo dice.
  const [refrescando, iniciar] = useTransition()

  const trabajando = ocupado !== null || refrescando

  async function cambiar(nuevo: Modo) {
    if (nuevo === modo || trabajando) return
    setError('')
    setOcupado(nuevo)

    const r = await fetch('/api/perfil/modo', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modo: nuevo }),
    })
    const j = await r.json().catch(() => ({}))

    // ⚠️ Se suelta SIEMPRE, salga bien o mal. Antes solo se soltaba en la rama
    // de error: al acertar, `ocupado` se quedaba puesto y los dos botones
    // seguían deshabilitados. El cambio se había guardado, pero para volver a
    // tocar el selector había que recargar la página a mano.
    setOcupado(null)

    if (!r.ok) {
      setError(j.error ?? 'No se pudo cambiar de lado.')
      return
    }

    iniciar(() => {
      // El `?activar=` solo se limpia si de verdad está: `replace` a la MISMA
      // dirección se come el `refresh` que va detrás, y entonces el servidor no
      // vuelve a pintar nada — el menú y este selector se quedaban con el lado
      // viejo aunque en la base ya estuviera cambiado.
      if (pedido) router.replace('/panel', { scroll: false })
      router.refresh()
    })
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
      {pedido && pedido !== modo && (
        <p className="mb-3 rounded-xl border border-sol-300 bg-sol-50 px-4 py-2.5 text-sm font-semibold text-sol-800">
          {pedido === 'ofrezco'
            ? 'Para publicar servicios y postularte tienes que estar en «Ofrezco un servicio».'
            : 'Para publicar necesidades y recibir ofertas tienes que estar en «Busco un servicio».'}
        </p>
      )}

      <p className="text-sm font-bold text-slate-700">¿Qué quieres hacer ahora?</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {MODOS.map((m) => {
          const l = LADOS[m]
          const activo = m === modo
          return (
            <button
              key={m}
              type="button"
              aria-pressed={activo}
              // El botón del lado ACTIVO también se deshabilita: no lleva a
              // ninguna parte y `cambiar()` lo descarta igual.
              disabled={trabajando || activo}
              onClick={() => cambiar(m)}
              className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition disabled:opacity-60 ${
                activo ? l.activo : l.inactivo
              }`}
            >
              <span className="text-2xl" aria-hidden="true">
                {l.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold">{ETIQUETA_MODO[m]}</span>
                <span className="block text-xs text-slate-500">{l.texto}</span>
              </span>
              {activo ? (
                <span className="chip shrink-0 border-current bg-white/70">Aquí estás</span>
              ) : (
                <span className="shrink-0 text-sm font-bold">
                  {ocupado === m || (refrescando && !activo) ? 'Cambiando…' : 'Cambiar'}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Cambiar de lado no borra nada: lo que ya publicaste sigue ahí y lo vuelves a ver al
        regresar.
      </p>

      {error && (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}
    </div>
  )
}
