'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { SelectorCategoria, type CategoriaConSubs } from '@/components/SelectorCategoria'
import { CampoFotos } from '@/components/CampoFotos'
import { URGENCIAS, URGENCIA, esUrgencia, type Urgencia } from '@/lib/urgencia'

type Inicial = {
  id: number
  titulo: string
  descripcion: string
  categoriaId: number
  subcategoriaId: number | null
  subcategoriaOtra: string | null
  precioOfrecido: number | null
  ciudad: string
  distrito: string | null
  urgencia: string | null
  fechaDeseada: Date | null
  horario: string | null
  observaciones: string | null
  estado: string
  fotos: { id: number; url: string }[]
}

// Formulario de NECESIDAD, compartido por crear y editar (PDR §7).
export default function NecesidadForm({
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

  // Una necesidad anterior a este campo puede traer fecha sin urgencia: se
  // interpreta como lo que era, una fecha exacta. Y si no trae nada, se arranca
  // sin marcar: forzar un valor por defecto sería inventarse el dato.
  const [urgencia, setUrgencia] = useState<Urgencia | ''>(
    esUrgencia(inicial?.urgencia)
      ? inicial.urgencia
      : inicial?.fechaDeseada
        ? 'fecha_fija'
        : '',
  )

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setEnviando(true)

    // Los dos botones son `submit` con el mismo nombre y distinto valor. Se
    // pasa el `submitter` a FormData para saber cuál se pulsó: sin él, el
    // valor del botón no viaja y "guardar" y "publicar" serían idénticos.
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const datos = new FormData(e.currentTarget, submitter)
    const publicar = datos.get('publicar') === '1'

    const url = editando ? `/api/necesidades/${inicial.id}` : '/api/necesidades'
    const r = await fetch(url, { method: editando ? 'PATCH' : 'POST', body: datos })
    const j = await r.json().catch(() => ({}))

    if (!r.ok) {
      setError(j.error ?? 'No se pudo guardar.')
      setEnviando(false)
      return
    }

    // Al editar hay que pedir la revisión aparte: el PATCH no cambia el estado.
    // Y se pide `en_revision`, NO `publicada`: el dueño no puede publicar por su
    // cuenta (ver la moderación previa). Pedir `publicada` aquí devolvía un 409
    // que nadie miraba, y la publicación se quedaba en borrador en silencio.
    if (editando && publicar && inicial.estado === 'borrador') {
      await fetch(`/api/necesidades/${inicial.id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'en_revision' }),
      })
    }

    router.push(`/necesidades/${editando ? inicial.id : j.id}`)
    router.refresh()
  }

  async function quitarFoto(id: number) {
    const r = await fetch(`/api/fotos/${id}`, { method: 'DELETE' })
    if (r.ok) setFotos((f) => f.filter((x) => x.id !== id))
  }

  const fecha = inicial?.fechaDeseada
    ? new Date(inicial.fechaDeseada).toISOString().slice(0, 10)
    : ''

  return (
    <form onSubmit={enviar} className="space-y-6">
      <div className="tarjeta space-y-4">
        <div>
          <label className="etiqueta" htmlFor="titulo">
            ¿Qué necesitas? <span className="text-rose-500">*</span>
          </label>
          <input
            id="titulo"
            name="titulo"
            required
            minLength={5}
            defaultValue={inicial?.titulo}
            className="campo"
            placeholder="Ej: Pintar habitación"
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
            Describe el trabajo <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="descripcion"
            name="descripcion"
            required
            minLength={20}
            rows={5}
            defaultValue={inicial?.descripcion}
            className="campo"
            placeholder="Ej: Pintar habitación de aproximadamente 10 m². No incluye techo. Mismo color. Se requiere lijado y resanado en algunas partes."
          />
          <p className="ayuda">
            Mientras más detalles des, mejores serán las ofertas que recibas. No escribas tu teléfono
            ni tu correo aquí: se comparten solos cuando aceptes una oferta.
          </p>
        </div>

        <CampoFotos yaSubidas={fotos} alQuitarSubida={editando ? quitarFoto : undefined} />
      </div>

      <div className="tarjeta space-y-4">
        <h2 className="font-bold text-slate-700">Condiciones</h2>

        <div>
          <label className="etiqueta" htmlFor="precioOfrecido">
            ¿Cuánto ofreces? (S/)
          </label>
          <input
            id="precioOfrecido"
            name="precioOfrecido"
            type="number"
            min="0"
            step="0.01"
            defaultValue={inicial?.precioOfrecido ?? ''}
            className="campo sm:max-w-56"
            placeholder="100.00"
          />
          <p className="ayuda">Déjalo vacío si prefieres que te propongan un precio.</p>
        </div>

        {/* Para cuándo. Se elige entre opciones porque casi nadie tiene una
            fecha exacta en la cabeza, y un campo de calendario obliga a
            inventarse una. El calendario aparece solo si de verdad hace falta.
            El valor viaja en un input oculto: los botones no envían nada. */}
        <fieldset>
          <legend className="etiqueta">¿Para cuándo lo necesitas?</legend>
          <input type="hidden" name="urgencia" value={urgencia} />

          <div className="mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {URGENCIAS.map((u) => {
              const o = URGENCIA[u]
              const activa = urgencia === u
              return (
                <button
                  key={u}
                  type="button"
                  aria-pressed={activa}
                  onClick={() => setUrgencia(activa ? '' : u)}
                  className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left transition ${
                    activa ? o.clase : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className="text-xl" aria-hidden="true">
                    {o.emoji}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-slate-800">{o.etiqueta}</span>
                    <span className="block text-xs text-slate-500">{o.ayuda}</span>
                  </span>
                </button>
              )
            })}
          </div>

          {urgencia === 'fecha_fija' ? (
            <div className="mt-3">
              <label className="etiqueta" htmlFor="fechaDeseada">
                ¿Qué día? <span className="text-rose-500">*</span>
              </label>
              <input
                id="fechaDeseada"
                name="fechaDeseada"
                type="date"
                required
                defaultValue={fecha}
                className="campo sm:max-w-56"
              />
            </div>
          ) : (
            // Sigue viajando vacío para que al cambiar de opción la fecha
            // anterior se borre en vez de quedarse guardada a escondidas.
            <input type="hidden" name="fechaDeseada" value="" />
          )}

          <p className="ayuda">
            Opcional, pero ayuda mucho: es lo primero que mira quien decide si puede tomar el
            trabajo.
          </p>
        </fieldset>

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
          </div>
          <div>
            <label className="etiqueta" htmlFor="distrito">
              Distrito o zona
            </label>
            <input
              id="distrito"
              name="distrito"
              defaultValue={inicial?.distrito ?? ''}
              className="campo"
              placeholder="Baños del Inca"
            />
            <p className="ayuda">Tu dirección exacta nunca se muestra.</p>
          </div>
        </div>

        <div>
          <label className="etiqueta" htmlFor="horario">
            Horario preferido
          </label>
          <input
            id="horario"
            name="horario"
            defaultValue={inicial?.horario ?? ''}
            className="campo"
            placeholder="Mañanas, fines de semana…"
          />
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
            placeholder="Cualquier detalle adicional que deba saber quien haga el trabajo."
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
        <button type="submit" name="publicar" value="1" disabled={enviando} className="btn-cielo">
          {enviando ? 'Guardando…' : 'Publicar y recibir ofertas'}
        </button>
        <Link href={editando ? `/necesidades/${inicial.id}` : '/necesidades'} className="btn-secundario">
          Cancelar
        </Link>
      </div>
    </form>
  )
}
