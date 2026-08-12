'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useConfirmar } from '@/components/Confirmar'
import { Icono } from '@/components/Icono'

export type PaqueteAdmin = {
  id: number
  nombre: string
  creditos: number
  precio: number
  activo: boolean
  recargas: number
}

// Paquetes de créditos (PDR §30). Los valores del seed son solo un ejemplo:
// el admin los cambia aquí y no son una regla permanente.
export default function GestorPaquetes({ paquetes }: { paquetes: PaqueteAdmin[] }) {
  const router = useRouter()
  const { confirmar, dialogo } = useConfirmar()
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [editando, setEditando] = useState<number | null>(null)

  async function llamar(url: string, opciones: RequestInit) {
    setError('')
    setOcupado(true)
    const r = await fetch(url, opciones)
    const j = await r.json().catch(() => ({}))
    setOcupado(false)

    if (!r.ok) {
      setError(j.error ?? 'No se pudo completar la operación.')
      return false
    }
    router.refresh()
    return true
  }

  async function crear(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const d = new FormData(form)
    const ok = await llamar('/api/admin/paquetes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: d.get('nombre'),
        creditos: Number(d.get('creditos')),
        precio: Number(d.get('precio')),
      }),
    })
    if (ok) form.reset()
  }

  async function guardar(e: React.FormEvent<HTMLFormElement>, id: number) {
    e.preventDefault()
    const d = new FormData(e.currentTarget)
    const ok = await llamar(`/api/admin/paquetes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: d.get('nombre'),
        creditos: Number(d.get('creditos')),
        precio: Number(d.get('precio')),
      }),
    })
    if (ok) setEditando(null)
  }

  const alternar = (id: number, activo: boolean) =>
    llamar(`/api/admin/paquetes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !activo }),
    })

  async function borrar(p: PaqueteAdmin) {
    if (p.recargas > 0) {
      setError(
        `"${p.nombre}" tiene ${p.recargas} recarga(s) registradas. Desactívalo en vez de borrarlo, o el histórico quedaría roto.`,
      )
      return
    }
    const ok = await confirmar({
      titulo: '¿Eliminar este paquete?',
      mensaje: 'Dejará de ofrecerse. No se puede deshacer.',
      detalle: `${p.nombre} · ${p.creditos} créditos · S/ ${p.precio.toFixed(2)}`,
      tono: 'peligro',
    })
    if (!ok) return

    await llamar(`/api/admin/paquetes/${p.id}`, { method: 'DELETE' })
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}

      <form onSubmit={crear} className="tarjeta flex flex-wrap items-end gap-3">
        <div className="min-w-40 flex-1">
          <label className="etiqueta" htmlFor="nombre">
            Nombre
          </label>
          <input id="nombre" name="nombre" required className="campo" placeholder="Ej: Frecuente" />
        </div>
        <div className="w-32">
          <label className="etiqueta" htmlFor="creditos">
            Créditos
          </label>
          <input id="creditos" name="creditos" type="number" min="1" required className="campo" />
        </div>
        <div className="w-32">
          <label className="etiqueta" htmlFor="precio">
            Precio (S/)
          </label>
          <input id="precio" name="precio" type="number" min="0" step="0.01" required className="campo" />
        </div>
        <button type="submit" disabled={ocupado} className="btn-primario">
          <Icono nombre="mas" className="h-4 w-4" />
          Crear paquete
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {paquetes.map((p) =>
          editando === p.id ? (
            <form key={p.id} onSubmit={(e) => guardar(e, p.id)} className="tarjeta space-y-3">
              <div>
                <label className="etiqueta" htmlFor={`n-${p.id}`}>
                  Nombre
                </label>
                <input id={`n-${p.id}`} name="nombre" required defaultValue={p.nombre} className="campo" />
              </div>
              <div>
                <label className="etiqueta" htmlFor={`c-${p.id}`}>
                  Créditos
                </label>
                <input
                  id={`c-${p.id}`}
                  name="creditos"
                  type="number"
                  min="1"
                  required
                  defaultValue={p.creditos}
                  className="campo"
                />
              </div>
              <div>
                <label className="etiqueta" htmlFor={`p-${p.id}`}>
                  Precio (S/)
                </label>
                <input
                  id={`p-${p.id}`}
                  name="precio"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={p.precio}
                  className="campo"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={ocupado} className="btn-primario flex-1">
                  Guardar
                </button>
                <button type="button" onClick={() => setEditando(null)} className="btn-secundario">
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <article key={p.id} className={`tarjeta flex flex-col ${p.activo ? '' : 'opacity-60'}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{p.nombre}</p>
                {!p.activo && (
                  <span className="chip border-slate-300 bg-slate-100 text-slate-600">Inactivo</span>
                )}
              </div>
              <p className="mt-1 text-3xl font-extrabold text-marca-700">{p.creditos}</p>
              <p className="text-xs text-slate-500">créditos</p>
              <p className="mt-2 text-lg font-bold text-slate-800">S/ {p.precio.toFixed(2)}</p>
              <p className="text-xs text-slate-400">
                S/ {(p.precio / p.creditos).toFixed(2)} por crédito · {p.recargas} recarga(s)
              </p>

              <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                <button type="button" onClick={() => setEditando(p.id)} className="btn-secundario">
                  Editar
                </button>
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => alternar(p.id, p.activo)}
                  className="btn-secundario"
                >
                  {p.activo ? 'Desactivar' : 'Activar'}
                </button>
                <button type="button" disabled={ocupado} onClick={() => borrar(p)} className="btn-peligro">
                  Eliminar
                </button>
              </div>
            </article>
          ),
        )}
      </div>

      {dialogo}
    </div>
  )
}
