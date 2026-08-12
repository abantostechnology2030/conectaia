import { Icono, type NombreIcono } from './Icono'

// Cabecera de página: mismo título, subtítulo y zona de acciones en todas las
// pantallas, para que el usuario sepa siempre dónde está.
export function Encabezado({
  titulo,
  subtitulo,
  icono,
  children,
}: {
  titulo: string
  subtitulo?: string
  icono?: NombreIcono
  children?: React.ReactNode
}) {
  return (
    // `min-w-0` en las dos columnas: sin él, un título largo empuja los botones
    // fuera de la pantalla en un móvil en vez de partirse.
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {icono && (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-marino-100 text-marino-700 sm:h-11 sm:w-11">
            <Icono nombre={icono} className="h-5 w-5 sm:h-6 sm:w-6" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold tracking-tight text-marino-900 sm:text-2xl">
            {titulo}
          </h1>
          {subtitulo && <p className="mt-0.5 text-sm text-slate-500">{subtitulo}</p>}
        </div>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}
