'use client'

import { useState } from 'react'

export type CategoriaConSubs = {
  id: number
  nombre: string
  icono: string | null
  subcategorias: { id: number; nombre: string }[]
}

/**
 * Categoría + subcategoría encadenadas.
 *
 * Van juntas en un componente porque la lista de subcategorías depende de la
 * categoría elegida, y porque enviar una subcategoría de otra categoría es un
 * error que el usuario no puede ver pero que deja el matching sin funcionar
 * (por eso la API lo vuelve a comprobar en el servidor).
 */
/** Valor del desplegable cuando lo que se busca no está en la lista. */
const OTRO = 'otro'

export function SelectorCategoria({
  categorias,
  categoriaInicial,
  subcategoriaInicial,
  subcategoriaOtraInicial,
}: {
  categorias: CategoriaConSubs[]
  categoriaInicial?: number | null
  subcategoriaInicial?: number | null
  subcategoriaOtraInicial?: string | null
}) {
  const [categoriaId, setCategoriaId] = useState<number | ''>(categoriaInicial ?? '')
  // El desplegable guarda un número, '' (sin especificar) u 'otro'. Al editar,
  // si la publicación traía texto libre es que estaba en "Otro".
  const [subId, setSubId] = useState<number | '' | typeof OTRO>(
    subcategoriaOtraInicial ? OTRO : (subcategoriaInicial ?? ''),
  )

  const subs = categorias.find((c) => c.id === categoriaId)?.subcategorias ?? []

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="etiqueta" htmlFor="categoriaId">
          Categoría <span className="text-rose-500">*</span>
        </label>
        <select
          id="categoriaId"
          name="categoriaId"
          required
          className="campo"
          value={categoriaId}
          onChange={(e) => {
            setCategoriaId(e.target.value ? Number(e.target.value) : '')
            // La subcategoría anterior pertenecía a la categoría anterior: si
            // no se limpia, se enviaría una pareja imposible.
            setSubId('')
          }}
        >
          <option value="">Elige una categoría…</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icono} {c.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="etiqueta" htmlFor="subcategoriaId">
          Subcategoría
        </label>
        <select
          id="subcategoriaId"
          // Ojo: cuando vale 'otro' NO se envía como subcategoría, porque no
          // es un identificador. Se manda vacío y el texto viaja aparte.
          name={subId === OTRO ? 'subcategoriaElegida' : 'subcategoriaId'}
          className="campo"
          value={subId}
          onChange={(e) => {
            const v = e.target.value
            setSubId(v === OTRO ? OTRO : v ? Number(v) : '')
          }}
          disabled={subs.length === 0}
        >
          <option value="">{subs.length === 0 ? 'Elige primero una categoría' : 'Sin especificar'}</option>
          {subs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
          {/* La lista de subcategorías la fija el administrador y nunca va a
              cubrirlo todo. Sin esta salida, quien no se ve reflejado elige la
              que más se le parece —y ensucia el matching de esa otra— o deja
              el campo vacío y pierde los 15 puntos de subcategoría. */}
          {subs.length > 0 && <option value={OTRO}>Otro (especificar)…</option>}
        </select>

        {subId === OTRO ? (
          <div className="mt-2">
            <label className="etiqueta" htmlFor="subcategoriaOtra">
              ¿Cuál? <span className="text-rose-500">*</span>
            </label>
            <input
              id="subcategoriaOtra"
              name="subcategoriaOtra"
              required
              maxLength={60}
              defaultValue={subcategoriaOtraInicial ?? ''}
              className="campo"
              placeholder="Ej: Pintura epóxica para pisos"
            />
            <p className="ayuda">
              Se usa para encontrarte coincidencias. Escríbelo como lo diría alguien que lo busca.
            </p>
          </div>
        ) : (
          // Viaja vacío a propósito: si no, al pasar de "Otro" a una
          // subcategoría normal el texto anterior se quedaría guardado, sin
          // verse en la ficha y reapareciendo al volver a elegir "Otro".
          <input type="hidden" name="subcategoriaOtra" value="" />
        )}

        <p className="ayuda">Ayuda a encontrar coincidencias más precisas.</p>
      </div>
    </div>
  )
}
