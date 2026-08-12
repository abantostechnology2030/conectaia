// Etiqueta de estado. Recibe la pinta ya resuelta por lib/estados.ts para que
// el mismo estado se vea igual en todas las pantallas.
export function Chip({ texto, clase }: { texto: string; clase: string }) {
  return <span className={`chip ${clase}`}>{texto}</span>
}

/** Chip de compatibilidad de un match: "🎯 94%". */
export function ChipMatch({ puntaje, clase }: { puntaje: number; clase: string }) {
  return (
    <span className={`chip ${clase}`}>
      <span aria-hidden="true">🎯</span> {puntaje}% compatible
    </span>
  )
}
