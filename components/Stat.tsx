import Link from 'next/link'
import { Icono, type NombreIcono } from './Icono'

const TONOS: Record<string, string> = {
  marca: 'bg-marca-50 border-marca-200 text-marca-700',
  cielo: 'bg-cielo-50 border-cielo-300 text-cielo-700',
  menta: 'bg-menta-50 border-menta-300 text-menta-700',
  sol: 'bg-sol-50 border-sol-300 text-sol-700',
  durazno: 'bg-durazno-50 border-durazno-300 text-durazno-700',
  rosa: 'bg-rose-50 border-rose-200 text-rose-700',
  gris: 'bg-slate-50 border-slate-200 text-slate-600',
}

export function Stat({
  titulo,
  valor,
  icono,
  tono = 'marca',
  href,
  pie,
}: {
  titulo: string
  valor: string | number
  icono: NombreIcono
  tono?: keyof typeof TONOS
  href?: string
  pie?: string
}) {
  const contenido = (
    <div className={`tarjeta-suave h-full ${TONOS[tono]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* El rótulo se parte en dos líneas si hace falta en vez de
              recortarse: "Ofertas por revisar" cortado a la mitad no dice
              nada, y en un móvil estrecho se corta siempre. */}
          <p className="text-xs font-bold uppercase leading-tight tracking-wide opacity-70">
            {titulo}
          </p>
          <p className="mt-1 truncate text-2xl font-extrabold leading-none sm:text-3xl">{valor}</p>
          {pie && <p className="mt-1.5 text-xs font-semibold opacity-70">{pie}</p>}
        </div>
        <Icono nombre={icono} className="h-6 w-6 shrink-0 opacity-60 sm:h-7 sm:w-7" />
      </div>
    </div>
  )

  return href ? <Link href={href}>{contenido}</Link> : contenido
}
