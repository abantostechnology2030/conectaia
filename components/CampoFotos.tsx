'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Icono } from './Icono'

const MAX_BYTES = 5 * 1024 * 1024

/**
 * Selector de fotos con vista previa, para necesidades y servicios.
 *
 * La lista elegida vive en un `useState`, y un efecto la vuelca en el input
 * real con `DataTransfer`. Ese rodeo hace falta porque un `<input type=file>`
 * no admite que se le asigne una lista desde JavaScript de ninguna otra forma,
 * y sin él quitar una foto de la vista previa no la quitaría del envío.
 *
 * No sube nada por su cuenta: las fotos viajan en el mismo `FormData` que el
 * resto del formulario, así no quedan imágenes huérfanas si el guardado falla.
 */
export function CampoFotos({
  nombre = 'fotos',
  max = 5,
  yaSubidas = [],
  alQuitarSubida,
}: {
  nombre?: string
  max?: number
  /** Fotos que ya están guardadas (al editar). */
  yaSubidas?: { id: number; url: string }[]
  alQuitarSubida?: (id: number) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [archivos, setArchivos] = useState<File[]>([])
  const [error, setError] = useState('')

  const cupo = max - yaSubidas.length - archivos.length

  // Las URL de vista previa se calculan una vez por lista de archivos y se
  // revocan cuando esa lista cambia o el componente se desmonta: sin revocarlas
  // cada render filtraría un blob en memoria.
  const previas = useMemo(() => archivos.map((f) => URL.createObjectURL(f)), [archivos])
  useEffect(() => () => previas.forEach((u) => URL.revokeObjectURL(u)), [previas])

  // Sincroniza la selección con el input real que leerá el FormData.
  useEffect(() => {
    if (!input.current || typeof DataTransfer === 'undefined') return
    const dt = new DataTransfer()
    for (const f of archivos) dt.items.add(f)
    input.current.files = dt.files
  }, [archivos])

  function agregar(lista: FileList | null) {
    if (!lista) return
    setError('')

    const entrantes = [...lista]
    const pesados = entrantes.filter((f) => f.size > MAX_BYTES)
    const validos = entrantes.filter((f) => f.size <= MAX_BYTES)
    const aceptados = validos.slice(0, Math.max(0, cupo))

    if (pesados.length > 0) setError(`"${pesados[0].name}" supera los 5 MB.`)
    else if (validos.length > aceptados.length) setError(`Solo puedes subir ${max} fotos en total.`)

    if (aceptados.length > 0) setArchivos((a) => [...a, ...aceptados])
  }

  function quitar(i: number) {
    setArchivos((a) => a.filter((_, j) => j !== i))
    setError('')
  }

  return (
    <div>
      <span className="etiqueta">Fotografías</span>

      <div className="flex flex-wrap gap-3">
        {yaSubidas.map((f) => (
          <div key={f.id} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.url} alt="" className="h-24 w-24 rounded-xl border border-slate-200 object-cover" />
            {alQuitarSubida && (
              <button
                type="button"
                onClick={() => alQuitarSubida(f.id)}
                aria-label="Quitar esta foto"
                className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-rose-600 text-xs font-bold text-white shadow"
              >
                ×
              </button>
            )}
          </div>
        ))}

        {archivos.map((f, i) => (
          <div key={`${f.name}-${f.size}-${i}`} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previas[i]}
              alt=""
              className="h-24 w-24 rounded-xl border border-marca-200 object-cover"
            />
            <button
              type="button"
              onClick={() => quitar(i)}
              aria-label={`Quitar ${f.name}`}
              className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-rose-600 text-xs font-bold text-white shadow"
            >
              ×
            </button>
          </div>
        ))}

        {cupo > 0 && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="grid h-24 w-24 place-items-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400 transition hover:border-marca-400 hover:text-marca-500"
          >
            <span className="grid place-items-center gap-1">
              <Icono nombre="foto" className="h-6 w-6" />
              <span className="text-xs font-semibold">Agregar</span>
            </span>
          </button>
        )}
      </div>

      <input
        ref={input}
        type="file"
        name={nombre}
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => agregar(e.target.files)}
      />

      <p className="ayuda">JPG, PNG o WEBP · hasta 5 MB cada una · máximo {max} fotos.</p>
      {error && <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  )
}
