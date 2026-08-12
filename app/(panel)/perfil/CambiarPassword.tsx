'use client'

import { useState } from 'react'

export default function CambiarPassword() {
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setOk(false)

    const form = e.currentTarget
    const d = new FormData(form)
    const nueva = String(d.get('nueva') ?? '')

    if (nueva !== String(d.get('repetir') ?? '')) {
      setError('Las contraseñas nuevas no coinciden.')
      return
    }

    setOcupado(true)
    const r = await fetch('/api/perfil/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actual: d.get('actual'), nueva }),
    })
    const j = await r.json().catch(() => ({}))
    setOcupado(false)

    if (!r.ok) {
      setError(j.error ?? 'No se pudo cambiar la contraseña.')
      return
    }
    setOk(true)
    form.reset()
  }

  return (
    <form onSubmit={enviar} className="tarjeta space-y-4">
      <h2 className="font-bold text-slate-700">Cambiar contraseña</h2>

      <div>
        <label className="etiqueta" htmlFor="actual">
          Contraseña actual
        </label>
        <input
          id="actual"
          name="actual"
          type="password"
          required
          autoComplete="current-password"
          className="campo"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="etiqueta" htmlFor="nueva">
            Nueva contraseña
          </label>
          <input
            id="nueva"
            name="nueva"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="campo"
          />
        </div>
        <div>
          <label className="etiqueta" htmlFor="repetir">
            Repetir la nueva
          </label>
          <input
            id="repetir"
            name="repetir"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="campo"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}
      {ok && (
        <p className="rounded-xl border border-menta-300 bg-menta-50 px-4 py-2.5 text-sm font-semibold text-menta-700">
          ✅ Contraseña actualizada.
        </p>
      )}

      <button type="submit" disabled={ocupado} className="btn-secundario">
        {ocupado ? 'Cambiando…' : 'Cambiar contraseña'}
      </button>
    </form>
  )
}
