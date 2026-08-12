'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useConfirmar } from '@/components/Confirmar'

// Suspender/reactivar una cuenta y ajustar sus créditos (PDR §32, §39).
export default function AccionesUsuario({
  id,
  nombre,
  estado,
  creditos,
}: {
  id: number
  nombre: string
  estado: string
  creditos: number
}) {
  const router = useRouter()
  const { confirmar, dialogo } = useConfirmar()
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [abierto, setAbierto] = useState(false)

  async function cambiarEstado() {
    const nuevo = estado === 'activo' ? 'suspendido' : 'activo'
    setError('')

    const ok = await confirmar(
      nuevo === 'suspendido'
        ? {
            titulo: '¿Suspender esta cuenta?',
            mensaje:
              'No podrá entrar a la plataforma. Sus necesidades publicadas se cancelarán y sus servicios se desactivarán.',
            detalle: nombre,
            tono: 'peligro',
            botonConfirmar: 'Sí, suspender',
          }
        : {
            titulo: '¿Reactivar esta cuenta?',
            mensaje:
              'Podrá volver a entrar. Sus publicaciones NO se restauran solas: tendrá que volver a publicarlas.',
            detalle: nombre,
            tono: 'aviso',
            botonConfirmar: 'Sí, reactivar',
          },
    )
    if (!ok) return

    setOcupado(true)
    const r = await fetch(`/api/admin/usuarios/${id}`, {
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

  async function ajustar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const d = new FormData(e.currentTarget)
    setOcupado(true)
    const r = await fetch('/api/admin/creditos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuarioId: id,
        cantidad: Number(d.get('cantidad')),
        tipo: d.get('tipo'),
        motivo: d.get('motivo'),
      }),
    })
    const j = await r.json().catch(() => ({}))
    setOcupado(false)

    if (!r.ok) {
      setError(j.error ?? 'No se pudo ajustar el saldo.')
      return
    }
    setAbierto(false)
    router.refresh()
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={ocupado}
          onClick={cambiarEstado}
          className={estado === 'activo' ? 'btn-peligro' : 'btn-menta'}
        >
          {estado === 'activo' ? 'Suspender' : 'Reactivar'}
        </button>
        <button type="button" onClick={() => setAbierto((a) => !a)} className="btn-secundario">
          Ajustar créditos
        </button>
      </div>

      {abierto && (
        <form onSubmit={ajustar} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-600">
            Saldo actual: <strong>{creditos}</strong> crédito(s).
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="etiqueta" htmlFor={`tipo-${id}`}>
                Tipo
              </label>
              <select id={`tipo-${id}`} name="tipo" className="campo" defaultValue="devolucion">
                <option value="devolucion">Devolución</option>
                <option value="ajuste">Ajuste administrativo</option>
              </select>
            </div>
            <div>
              <label className="etiqueta" htmlFor={`cantidad-${id}`}>
                Cantidad
              </label>
              <input
                id={`cantidad-${id}`}
                name="cantidad"
                type="number"
                step="1"
                required
                className="campo"
                placeholder="1 para sumar, -1 para restar"
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="etiqueta" htmlFor={`motivo-${id}`}>
              Motivo
            </label>
            <input
              id={`motivo-${id}`}
              name="motivo"
              required
              minLength={5}
              className="campo"
              placeholder="Devolución por trabajo cancelado sin contacto real"
            />
            <p className="ayuda">Queda registrado en el historial y no se puede borrar.</p>
          </div>

          <button type="submit" disabled={ocupado} className="btn-primario mt-3">
            {ocupado ? 'Aplicando…' : 'Aplicar movimiento'}
          </button>
        </form>
      )}

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}

      {dialogo}
    </div>
  )
}
