'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Confirmación para lo que no tiene vuelta atrás.
 *
 * Reemplaza al `confirm()` del navegador: aquel no se puede traducir, sale con
 * la tipografía del sistema y en algunos navegadores se puede silenciar. Este
 * dice siempre QUÉ va a pasar y QUÉ cuesta.
 *
 * En ConectaIA es obligatorio antes de gastar un crédito (PDR §13): el usuario
 * tiene que ver el aviso y confirmar.
 *
 *   const { confirmar, dialogo } = useConfirmar()
 *   ...
 *   if (!(await confirmar({ titulo: '…', mensaje: '…' }))) return
 *   ...
 *   return (<div>… {dialogo}</div>)
 */
export type Pregunta = {
  titulo: string
  mensaje: string
  /** El detalle concreto: el nombre de la oferta, la publicación… */
  detalle?: string
  /** Lo que cuesta o lo que se pierde, resaltado. */
  advertencia?: string
  botonConfirmar?: string
  botonCancelar?: string
  /** 'peligro' borra o cancela · 'credito' cobra · 'aviso' es reversible. */
  tono?: 'peligro' | 'credito' | 'aviso'
}

export function useConfirmar() {
  const [pregunta, setPregunta] = useState<Pregunta | null>(null)
  const responder = useRef<((ok: boolean) => void) | null>(null)

  const confirmar = useCallback((p: Pregunta) => {
    responder.current?.(false) // si quedaba otra abierta, se da por cancelada
    setPregunta(p)
    return new Promise<boolean>((resolver) => {
      responder.current = resolver
    })
  }, [])

  const cerrar = useCallback((ok: boolean) => {
    setPregunta(null)
    const resolver = responder.current
    responder.current = null
    resolver?.(ok)
  }, [])

  return {
    confirmar,
    dialogo: pregunta ? <Dialogo pregunta={pregunta} alCerrar={cerrar} /> : null,
  }
}

const ESTILO = {
  peligro: { emoji: '🗑️', fondo: 'bg-rose-50', borde: 'border-rose-100', boton: 'bg-rose-600 text-white hover:bg-rose-700', porDefecto: 'Sí, eliminar' },
  credito: { emoji: '💳', fondo: 'bg-marca-50', borde: 'border-marca-100', boton: 'bg-marca-600 text-white hover:bg-marca-700', porDefecto: 'Sí, continuar' },
  aviso: { emoji: '❓', fondo: 'bg-slate-100', borde: 'border-slate-200', boton: 'bg-slate-800 text-white hover:bg-slate-900', porDefecto: 'Sí, continuar' },
}

function Dialogo({ pregunta, alCerrar }: { pregunta: Pregunta; alCerrar: (ok: boolean) => void }) {
  const { titulo, mensaje, detalle, advertencia, tono = 'peligro' } = pregunta
  const est = ESTILO[tono]
  const botonConfirmar = pregunta.botonConfirmar ?? est.porDefecto
  const botonCancelar = pregunta.botonCancelar ?? 'Cancelar'

  useEffect(() => {
    const alTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') alCerrar(false)
    }
    document.addEventListener('keydown', alTecla)
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', alTecla)
      document.body.style.overflow = antes
    }
  }, [alCerrar])

  // El diálogo solo existe tras un clic, así que en el servidor nunca se dibuja
  // y no hay desajuste de hidratación. Va en un portal porque las tarjetas se
  // elevan con `transform` al pasar el cursor, y un ancestro transformado
  // rompería el `position: fixed`.
  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) alCerrar(false)
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmar-titulo"
        aria-describedby="confirmar-mensaje"
        className={`aparece w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl ${est.borde}`}
      >
        <div className="flex gap-4">
          <span
            aria-hidden
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl ${est.fondo}`}
          >
            {est.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="confirmar-titulo" className="text-lg font-extrabold text-slate-800">
              {titulo}
            </h2>
            <p id="confirmar-mensaje" className="mt-1 text-sm text-slate-600">
              {mensaje}
            </p>
          </div>
        </div>

        {detalle && (
          <p className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold break-words whitespace-pre-line text-slate-700">
            {detalle}
          </p>
        )}

        {advertencia && (
          <p
            className={`mt-3 rounded-xl border px-4 py-2.5 text-sm font-semibold ${
              tono === 'credito'
                ? 'border-marca-200 bg-marca-50 text-marca-800'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            {advertencia}
          </p>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" autoFocus onClick={() => alCerrar(false)} className="btn-secundario">
            {botonCancelar}
          </button>
          <button type="button" onClick={() => alCerrar(true)} className={`btn ${est.boton}`}>
            {botonConfirmar}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
