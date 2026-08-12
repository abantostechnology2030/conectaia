'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useConfirmar } from '@/components/Confirmar'
import { Icono } from '@/components/Icono'

export type CategoriaAdmin = {
  id: number
  nombre: string
  icono: string | null
  activa: boolean
  enUso: number
  subcategorias: { id: number; nombre: string; activa: boolean; enUso: number }[]
}

/**
 * Gestión del catálogo (PDR §39).
 *
 * La regla que guía toda la pantalla: lo que está EN USO se desactiva, no se
 * borra. Borrar una categoría con publicaciones dejaría esas publicaciones
 * apuntando a la nada y tumbaría el matching sin dar ningún error visible.
 */
export default function GestorCategorias({ categorias }: { categorias: CategoriaAdmin[] }) {
  const router = useRouter()
  const { confirmar, dialogo } = useConfirmar()
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [abierta, setAbierta] = useState<number | null>(null)

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

  async function crearCategoria(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const d = new FormData(form)
    const ok = await llamar('/api/admin/categorias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: d.get('nombre'), icono: d.get('icono') }),
    })
    if (ok) form.reset()
  }

  async function crearSub(e: React.FormEvent<HTMLFormElement>, categoriaId: number) {
    e.preventDefault()
    const form = e.currentTarget
    const d = new FormData(form)
    const ok = await llamar('/api/admin/categorias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: d.get('nombre'), categoriaId }),
    })
    if (ok) form.reset()
  }

  const alternar = (id: number, activa: boolean, sub = false) =>
    llamar(`/api/admin/categorias/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activa: !activa, sub }),
    })

  async function borrar(id: number, nombre: string, enUso: number, sub = false) {
    if (enUso > 0) {
      setError(
        `"${nombre}" tiene ${enUso} publicación(es). Desactívala en vez de borrarla, o las publicaciones quedarían sin categoría.`,
      )
      return
    }
    const ok = await confirmar({
      titulo: sub ? '¿Eliminar esta subcategoría?' : '¿Eliminar esta categoría?',
      mensaje: 'No se puede deshacer.',
      detalle: nombre,
      tono: 'peligro',
    })
    if (!ok) return

    await llamar(`/api/admin/categorias/${id}${sub ? '?sub=1' : ''}`, { method: 'DELETE' })
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}

      <form onSubmit={crearCategoria} className="tarjeta flex flex-wrap items-end gap-3">
        <div className="w-24">
          <label className="etiqueta" htmlFor="icono">
            Emoji
          </label>
          <input id="icono" name="icono" className="campo" placeholder="🔧" defaultValue="🔧" />
        </div>
        <div className="min-w-48 flex-1">
          <label className="etiqueta" htmlFor="nombre">
            Nueva categoría
          </label>
          <input id="nombre" name="nombre" required className="campo" placeholder="Ej: Fontanería" />
        </div>
        <button type="submit" disabled={ocupado} className="btn-primario">
          <Icono nombre="mas" className="h-4 w-4" />
          Agregar
        </button>
      </form>

      <div className="space-y-3">
        {categorias.map((c) => (
          <article key={c.id} className={`tarjeta ${c.activa ? '' : 'opacity-60'}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setAbierta(abierta === c.id ? null : c.id)}
                className="flex min-w-0 items-center gap-3 text-left"
              >
                <span className="text-2xl">{c.icono}</span>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800">{c.nombre}</p>
                  <p className="text-xs text-slate-500">
                    {c.subcategorias.length} subcategoría(s) · {c.enUso} publicación(es)
                    {!c.activa && ' · Desactivada'}
                  </p>
                </div>
                <Icono
                  nombre="chevron"
                  className={`h-4 w-4 shrink-0 text-slate-400 transition ${
                    abierta === c.id ? 'rotate-90' : ''
                  }`}
                />
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => alternar(c.id, c.activa)}
                  className="btn-secundario"
                >
                  {c.activa ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => borrar(c.id, c.nombre, c.enUso)}
                  className="btn-peligro"
                >
                  Eliminar
                </button>
              </div>
            </div>

            {abierta === c.id && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <ul className="space-y-2">
                  {c.subcategorias.map((s) => (
                    <li
                      key={s.id}
                      className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 ${
                        s.activa ? 'bg-white' : 'bg-slate-50 opacity-60'
                      }`}
                    >
                      <span className="text-sm font-semibold text-slate-700">
                        {s.nombre}
                        <span className="ml-2 text-xs font-normal text-slate-400">
                          {s.enUso} publicación(es)
                        </span>
                      </span>
                      <span className="flex gap-2">
                        <button
                          type="button"
                          disabled={ocupado}
                          onClick={() => alternar(s.id, s.activa, true)}
                          className="text-xs font-bold text-marca-600 hover:underline"
                        >
                          {s.activa ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          type="button"
                          disabled={ocupado}
                          onClick={() => borrar(s.id, s.nombre, s.enUso, true)}
                          className="text-xs font-bold text-rose-600 hover:underline"
                        >
                          Eliminar
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>

                <form onSubmit={(e) => crearSub(e, c.id)} className="mt-3 flex flex-wrap items-end gap-2">
                  <div className="min-w-48 flex-1">
                    <label className="etiqueta" htmlFor={`sub-${c.id}`}>
                      Nueva subcategoría
                    </label>
                    <input id={`sub-${c.id}`} name="nombre" required className="campo" />
                  </div>
                  <button type="submit" disabled={ocupado} className="btn-secundario">
                    Agregar
                  </button>
                </form>
              </div>
            )}
          </article>
        ))}
      </div>

      {dialogo}
    </div>
  )
}
