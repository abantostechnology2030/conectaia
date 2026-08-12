// Estrellas de reputación. Sin librería: una fila de ★ con la parte
// proporcional pintada encima mediante un recorte por ancho, que es lo único
// que da medias estrellas exactas sin SVG por cada valor.
export function Estrellas({
  valor,
  total,
  tam = 'sm',
}: {
  valor: number
  /** Número de calificaciones. Si es 0, se dice que no hay ninguna. */
  total?: number
  tam?: 'sm' | 'md' | 'lg'
}) {
  const clase = tam === 'lg' ? 'text-2xl' : tam === 'md' ? 'text-lg' : 'text-sm'

  if (total === 0) {
    return <span className="text-xs font-semibold text-slate-400">Sin calificaciones</span>
  }

  const porcentaje = Math.max(0, Math.min(100, (valor / 5) * 100))

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`relative inline-block leading-none ${clase}`} aria-hidden="true">
        <span className="text-slate-200">★★★★★</span>
        <span
          className="absolute inset-y-0 left-0 overflow-hidden text-sol-500"
          style={{ width: `${porcentaje}%` }}
        >
          ★★★★★
        </span>
      </span>
      <span className="text-sm font-bold text-slate-700">{valor.toFixed(1)}</span>
      {total !== undefined && <span className="text-xs text-slate-500">({total})</span>}
      <span className="sr-only">
        {valor.toFixed(1)} de 5 estrellas{total !== undefined ? `, ${total} calificaciones` : ''}
      </span>
    </span>
  )
}

/** Selector de estrellas para el formulario de calificación. */
export function SelectorEstrellas({
  valor,
  alCambiar,
}: {
  valor: number
  alCambiar: (n: number) => void
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => alCambiar(n)}
          aria-label={`${n} estrella${n === 1 ? '' : 's'}`}
          aria-pressed={valor === n}
          className={`text-3xl leading-none transition hover:scale-110 ${
            n <= valor ? 'text-sol-500' : 'text-slate-200'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  )
}
