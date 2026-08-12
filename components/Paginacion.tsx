import Link from 'next/link'

// Paginación por enlaces (no por estado de cliente): así la página se puede
// compartir, recargar y volver atrás sin perder el sitio.
export function Paginacion({
  pagina,
  paginas,
  base,
  params = {},
}: {
  pagina: number
  paginas: number
  /** Ruta sin parámetros, p. ej. '/necesidades' */
  base: string
  /** Filtros activos que hay que conservar al cambiar de página. */
  params?: Record<string, string | undefined>
}) {
  if (paginas <= 1) return null

  const url = (p: number) => {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v)
    q.set('p', String(p))
    return `${base}?${q.toString()}`
  }

  return (
    <nav className="flex items-center justify-center gap-2 pt-2" aria-label="Paginación">
      {pagina > 1 ? (
        <Link href={url(pagina - 1)} className="btn-secundario">
          Anterior
        </Link>
      ) : (
        <span className="btn-secundario opacity-40">Anterior</span>
      )}

      <span className="px-3 text-sm font-semibold text-slate-600">
        Página {pagina} de {paginas}
      </span>

      {pagina < paginas ? (
        <Link href={url(pagina + 1)} className="btn-secundario">
          Siguiente
        </Link>
      ) : (
        <span className="btn-secundario opacity-40">Siguiente</span>
      )}
    </nav>
  )
}
