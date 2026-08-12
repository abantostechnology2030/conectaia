import Link from 'next/link'

// Estado vacío. Nunca deja una lista en blanco: dice qué falta y ofrece el
// siguiente paso, que en un marketplace vacío es la mitad del trabajo.
export function Vacio({
  emoji = '📭',
  titulo,
  mensaje,
  accion,
}: {
  emoji?: string
  titulo: string
  mensaje?: string
  accion?: { href: string; label: string }
}) {
  return (
    <div className="elevar grid place-items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <span className="text-4xl" aria-hidden="true">
        {emoji}
      </span>
      <h3 className="mt-3 text-lg font-bold text-slate-700">{titulo}</h3>
      {mensaje && <p className="mt-1 max-w-md text-sm text-slate-500">{mensaje}</p>}
      {accion && (
        <Link href={accion.href} className="btn-primario mt-4">
          {accion.label}
        </Link>
      )}
    </div>
  )
}
