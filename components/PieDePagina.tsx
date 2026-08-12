/**
 * Pie de página de la aplicación: texto blanco sobre el azul del logotipo.
 *
 * El azul sale de `--color-logo-azul`, muestreado del propio archivo del
 * logotipo (ver `scripts/colores-logo.mjs`), no elegido a ojo. Sobre él va
 * texto blanco, que da un contraste de sobra para leerlo.
 *
 * El nombre de la marca va aquí como TEXTO y no con el logotipo: el logotipo
 * lleva el nombre en azul marino y sobre este fondo desaparecería.
 */
export function PieDePagina() {
  return (
    <footer className="bg-logo-azul px-4 py-5 text-center">
      <p className="text-sm text-white">
        <span className="font-bold">ConectaIA</span> © es un producto de{' '}
        <a
          href="https://www.solucionesctec.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-white underline decoration-white/50 underline-offset-2 transition hover:decoration-white"
        >
          SolucionesCTEC
        </a>
      </p>
      <p className="mt-1">
        <a
          href="https://www.solucionesctec.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-white/80 underline decoration-white/40 underline-offset-2 transition hover:text-white"
        >
          www.solucionesctec.com
        </a>
      </p>
    </footer>
  )
}
