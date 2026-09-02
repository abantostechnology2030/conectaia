/**
 * Pie de página de la aplicación: texto blanco sobre el azul del logotipo.
 *
 * El azul sale de `--color-logo-azul`, muestreado del propio archivo del
 * logotipo (ver `scripts/colores-logo.mjs`), no elegido a ojo. Sobre él va
 * texto blanco, que da un contraste de sobra para leerlo.
 *
 * ⚠️ TEMPORAL — mientras dure el concurso, el pie lleva el rótulo
 * «CONCURSO CREA Y EMPRENDE 2026» en lugar del crédito de SolucionesCTEC.
 * El original está guardado en CLAUDE.md ("Pie de página"), con el JSX exacto
 * para devolverlo tal cual; hay que revertir ADEMÁS la constante `PIE` de
 * `scripts/probar-marca.mjs`, que es la que comprueba este texto en todas las
 * pantallas.
 *
 * Sea cual sea el rótulo, el pie sale de este único componente: no duplicarlo
 * en ninguna pantalla, o cambiarlo dejará de ser un solo cambio.
 */
export function PieDePagina() {
  return (
    <footer className="bg-logo-azul px-4 py-5 text-center">
      <p className="text-sm font-bold tracking-wide text-white">CONCURSO CREA Y EMPRENDE 2026</p>
    </footer>
  )
}
