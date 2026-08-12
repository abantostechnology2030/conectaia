'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export type PorAprobar = {
  id: number
  titulo: string
  descripcion: string
  observaciones: string | null
  categoria: string
  ciudad: string
  autorId: number
  autor: string
  creada: string
  /** Las fotos van AQUÍ, no tras un enlace: también se cuelan teléfonos en
   *  ellas, y la ficha pública ni siquiera existe todavía (daría 404). */
  fotos: string[]
}

/**
 * La cola de publicaciones esperando el visto bueno.
 *
 * Va en TARJETAS y no en filas de tabla a propósito: para aprobar hay que poder
 * leer el texto entero, que es justo donde aparece el teléfono colado o la
 * oferta que no es lo que dice ser. Una fila recortada obliga a abrir cada
 * publicación en otra pestaña, y entonces nadie revisa.
 *
 * Rechazar EXIGE motivo, por la misma razón que un ajuste de créditos: sin
 * explicación, el usuario solo puede volver a enviar exactamente lo mismo.
 */
export default function ColaAprobacion({
  tipo,
  items,
}: {
  tipo: 'necesidad' | 'servicio'
  items: PorAprobar[]
}) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState<number | null>(null)
  const [rechazando, setRechazando] = useState<number | null>(null)
  const [motivo, setMotivo] = useState('')

  async function resolver(id: number, accion: 'aprobar' | 'rechazar') {
    setError('')

    if (accion === 'rechazar' && motivo.trim().length < 5) {
      setError('Escribe por qué no se aprueba (mínimo 5 caracteres).')
      return
    }

    setOcupado(id)
    const r = await fetch(`/api/admin/aprobaciones/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, accion, motivo: motivo.trim() }),
    })
    const j = await r.json().catch(() => ({}))
    setOcupado(null)

    if (!r.ok) {
      setError(j.error ?? 'No se pudo resolver.')
      return
    }

    setRechazando(null)
    setMotivo('')
    router.refresh()
  }

  if (items.length === 0) return null

  const queEs = tipo === 'necesidad' ? 'necesidad' : 'servicio'

  return (
    <section className="rounded-2xl border-2 border-sol-300 bg-sol-50 p-5">
      <h2 className="text-lg font-extrabold text-sol-900">
        ⏳ Esperando aprobación ({items.length})
      </h2>
      <p className="mt-1 text-sm text-sol-800">
        Nadie más las ve hasta que las apruebes. Lee el texto completo antes de decidir.
      </p>

      {error && (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}

      <div className="mt-4 space-y-3">
        {items.map((n) => (
          <article key={n.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="chip border-slate-200 bg-slate-50 text-slate-600">{n.categoria}</span>
              <span>{n.ciudad}</span>
              <span>·</span>
              <Link href={`/u/${n.autorId}`} className="font-semibold hover:underline">
                {n.autor}
              </Link>
              <span>·</span>
              <span>{n.creada}</span>
            </div>

            <h3 className="mt-2 font-bold text-slate-800">{n.titulo}</h3>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{n.descripcion}</p>

            {n.observaciones && (
              <p className="mt-2 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                <span className="font-semibold">Observaciones: </span>
                {n.observaciones}
              </p>
            )}

            {n.fotos.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {n.fotos.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={url} src={url} alt="" className="h-24 w-full rounded-lg object-cover" />
                ))}
              </div>
            )}

            {rechazando === n.id ? (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3">
                <label className="etiqueta" htmlFor={`motivo-${n.id}`}>
                  ¿Por qué no se aprueba? <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id={`motivo-${n.id}`}
                  rows={2}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="campo"
                  placeholder="Ej: incluye un número de teléfono en la descripción."
                />
                <p className="ayuda">Se le envía tal cual al usuario para que sepa qué corregir.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={ocupado !== null}
                    onClick={() => resolver(n.id, 'rechazar')}
                    className="btn-peligro"
                  >
                    {ocupado === n.id ? 'Enviando…' : 'Confirmar que no se aprueba'}
                  </button>
                  <button
                    type="button"
                    disabled={ocupado !== null}
                    onClick={() => {
                      setRechazando(null)
                      setMotivo('')
                      setError('')
                    }}
                    className="btn-secundario"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={ocupado !== null}
                  onClick={() => resolver(n.id, 'aprobar')}
                  className="btn-primario"
                >
                  {ocupado === n.id ? 'Aprobando…' : 'Aprobar y publicar'}
                </button>
                <button
                  type="button"
                  disabled={ocupado !== null}
                  onClick={() => {
                    setRechazando(n.id)
                    setMotivo('')
                    setError('')
                  }}
                  className="btn-secundario"
                >
                  No aprobar
                </button>
              </div>
            )}
          </article>
        ))}
      </div>

      <p className="mt-4 text-xs text-sol-800">
        Al aprobar, la {queEs} se publica, empieza a cruzarse con el matching y el usuario recibe un
        aviso.
      </p>
    </section>
  )
}
