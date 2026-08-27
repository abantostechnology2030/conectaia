'use client'

import { useState } from 'react'
import Link from 'next/link'

type Categoria = { id: number; nombre: string; icono: string | null }

/**
 * Categorías de la portada, con un switch para elegir a qué lado apuntan los
 * enlaces: "Necesito" manda a `/buscar?tipo=necesidad&categoria=…`, "Ofrezco"
 * a `/buscar?tipo=servicio&categoria=…`. Antes solo enlazaban a necesidades
 * —el `tipo` de `/buscar` por defecto—, así que quien llegaba buscando
 * trabajo por categoría no tenía forma de hacerlo desde aquí.
 *
 * Es un componente aparte, y no el switch inline en `page.tsx`, porque
 * `Portada` es un server component: sin este archivo no habría dónde poner
 * el `useState` del botón activo.
 */
export function CategoriasHome({ categorias }: { categorias: Categoria[] }) {
  const [tipo, setTipo] = useState<'necesidad' | 'servicio'>('necesidad')

  return (
    <>
      <div className="mx-auto flex max-w-xs gap-2 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setTipo('necesidad')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition ${
            tipo === 'necesidad' ? 'bg-cielo-500 text-white shadow-sm' : 'bg-cielo-50 text-cielo-700'
          }`}
        >
          🔎 Necesito
        </button>
        <button
          type="button"
          onClick={() => setTipo('servicio')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition ${
            tipo === 'servicio' ? 'bg-menta-500 text-white shadow-sm' : 'bg-menta-50 text-menta-700'
          }`}
        >
          🛠️ Ofrezco
        </button>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {categorias.map((c) => (
          <Link
            key={c.id}
            href={`/buscar?tipo=${tipo}&categoria=${c.id}`}
            className="elevar inline-flex items-center gap-2 rounded-xl border border-marino-200 bg-white px-4 py-2.5 text-sm font-semibold text-marino-800 hover:border-marino-400"
          >
            <span aria-hidden="true">{c.icono}</span>
            {c.nombre}
          </Link>
        ))}
      </div>
    </>
  )
}
