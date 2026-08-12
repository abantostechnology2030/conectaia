// Foto de perfil, con las iniciales de respaldo cuando no hay imagen.
// El color sale del nombre para que la misma persona tenga siempre el mismo,
// y no uno distinto en cada pantalla.

const TONOS = [
  'bg-marca-100 text-marca-700',
  'bg-cielo-100 text-cielo-700',
  'bg-menta-100 text-menta-700',
  'bg-sol-100 text-sol-700',
  'bg-durazno-100 text-durazno-700',
]

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[1][0]).toUpperCase()
}

function tono(nombre: string): string {
  let suma = 0
  for (const c of nombre) suma += c.charCodeAt(0)
  return TONOS[suma % TONOS.length]
}

export function Avatar({
  src,
  nombre,
  tam = 40,
}: {
  src?: string | null
  nombre: string
  tam?: number
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={nombre}
        width={tam}
        height={tam}
        style={{ width: tam, height: tam }}
        className="shrink-0 rounded-full object-cover"
      />
    )
  }

  return (
    <span
      style={{ width: tam, height: tam, fontSize: Math.max(11, tam * 0.36) }}
      className={`grid shrink-0 place-items-center rounded-full font-bold ${tono(nombre)}`}
      aria-hidden="true"
    >
      {iniciales(nombre)}
    </span>
  )
}
