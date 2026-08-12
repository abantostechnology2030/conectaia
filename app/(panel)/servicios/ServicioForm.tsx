'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { SelectorCategoria, type CategoriaConSubs } from '@/components/SelectorCategoria'
import { CampoFotos } from '@/components/CampoFotos'

type Inicial = {
  id: number
  nombre: string
  descripcion: string
  categoriaId: number
  subcategoriaId: number | null
  subcategoriaOtra: string | null
  experiencia: string | null
  precioDesde: number | null
  ciudad: string
  zona: string | null
  disponibilidad: string | null
  observaciones: string | null
  estado: string
  fotos: { id: number; url: string }[]
}

// Formulario de SERVICIO, compartido por crear y editar (PDR §8).
export default function ServicioForm({
  categorias,
  ciudadPorDefecto,
  inicial,
}: {
  categorias: CategoriaConSubs[]
  ciudadPorDefecto?: string | null
  inicial?: Inicial
}) {
  const router = useRouter()
  const editando = !!inicial
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [fotos, setFotos] = useState(inicial?.fotos ?? [])

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setEnviando(true)

    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const datos = new FormData(e.currentTarget, submitter)
    const publicar = datos.get('publicar') === '1'

    const url = editando ? `/api/servicios/${inicial.id}` : '/api/servicios'
    const r = await fetch(url, { method: editando ? 'PATCH' : 'POST', body: datos })
    const j = await r.json().catch(() => ({}))

    if (!r.ok) {
      setError(j.error ?? 'No se pudo guardar.')
      setEnviando(false)
      return
    }

    // Se pide `en_revision`, NO `publicado`: el dueño no puede publicar por su
    // cuenta (ver la moderación previa). Pedirlo devolvía un 409 que nadie
    // miraba, y el servicio se quedaba en borrador en silencio.
    if (editando && publicar && inicial.estado !== 'publicado') {
      await fetch(`/api/servicios/${inicial.id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'en_revision' }),
      })
    }

    router.push(`/servicios/${editando ? inicial.id : j.id}`)
    router.refresh()
  }

  async function quitarFoto(id: number) {
    const r = await fetch(`/api/fotos/${id}`, { method: 'DELETE' })
    if (r.ok) setFotos((f) => f.filter((x) => x.id !== id))
  }

  return (
    <form onSubmit={enviar} className="space-y-6">
      <div className="tarjeta space-y-4">
        <div>
          <label className="etiqueta" htmlFor="nombre">
            ¿Qué servicio ofreces? <span className="text-rose-500">*</span>
          </label>
          <input
            id="nombre"
            name="nombre"
            required
            minLength={5}
            defaultValue={inicial?.nombre}
            className="campo"
            placeholder="Ej: Pintura de interiores"
          />
        </div>

        <SelectorCategoria
          categorias={categorias}
          categoriaInicial={inicial?.categoriaId}
          subcategoriaInicial={inicial?.subcategoriaId}
          subcategoriaOtraInicial={inicial?.subcategoriaOtra}
        />

        <div>
          <label className="etiqueta" htmlFor="descripcion">
            Describe lo que haces <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="descripcion"
            name="descripcion"
            required
            minLength={20}
            rows={5}
            defaultValue={inicial?.descripcion}
            className="campo"
            placeholder="Ej: Realizo pintura de habitaciones, salas y oficinas. Experiencia en lijado, resanado y acabados."
          />
          <p className="ayuda">
            No escribas tu teléfono ni tu correo aquí: se comparten solos cuando alguien decida
            contactarte.
          </p>
        </div>

        <div>
          <label className="etiqueta" htmlFor="experiencia">
            Experiencia
          </label>
          <input
            id="experiencia"
            name="experiencia"
            defaultValue={inicial?.experiencia ?? ''}
            className="campo"
            placeholder="8 años"
          />
        </div>

        <CampoFotos yaSubidas={fotos} alQuitarSubida={editando ? quitarFoto : undefined} />
      </div>

      <div className="tarjeta space-y-4">
        <h2 className="font-bold text-slate-700">Dónde y cuándo trabajas</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="etiqueta" htmlFor="ciudad">
              Ciudad <span className="text-rose-500">*</span>
            </label>
            <input
              id="ciudad"
              name="ciudad"
              required
              defaultValue={inicial?.ciudad ?? ciudadPorDefecto ?? ''}
              className="campo"
              placeholder="Cajamarca"
            />
            <p className="ayuda">Se usa para encontrarte trabajos cerca.</p>
          </div>
          <div>
            <label className="etiqueta" htmlFor="zona">
              Zona que atiendes
            </label>
            <input
              id="zona"
              name="zona"
              defaultValue={inicial?.zona ?? ''}
              className="campo"
              placeholder="Cajamarca y alrededores"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="etiqueta" htmlFor="precioDesde">
              Precio desde (S/)
            </label>
            <input
              id="precioDesde"
              name="precioDesde"
              type="number"
              min="0"
              step="0.01"
              defaultValue={inicial?.precioDesde ?? ''}
              className="campo"
              placeholder="80.00"
            />
            <p className="ayuda">Un precio de referencia. Podrás ofertar distinto en cada trabajo.</p>
          </div>
          <div>
            <label className="etiqueta" htmlFor="disponibilidad">
              Disponibilidad
            </label>
            <input
              id="disponibilidad"
              name="disponibilidad"
              defaultValue={inicial?.disponibilidad ?? ''}
              className="campo"
              placeholder="Lunes a sábado"
            />
          </div>
        </div>

        <div>
          <label className="etiqueta" htmlFor="observaciones">
            Observaciones
          </label>
          <textarea
            id="observaciones"
            name="observaciones"
            rows={3}
            defaultValue={inicial?.observaciones ?? ''}
            className="campo"
            placeholder="Materiales incluidos, garantía, condiciones…"
          />
        </div>
      </div>

      {error && (
        <p className="whitespace-pre-line rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="submit" name="publicar" value="0" disabled={enviando} className="btn-secundario">
          Guardar como borrador
        </button>
        <button type="submit" name="publicar" value="1" disabled={enviando} className="btn-menta">
          {enviando ? 'Guardando…' : 'Publicar y recibir oportunidades'}
        </button>
        <Link href={editando ? `/servicios/${inicial.id}` : '/servicios'} className="btn-secundario">
          Cancelar
        </Link>
      </div>
    </form>
  )
}
