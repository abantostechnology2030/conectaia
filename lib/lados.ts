// Los dos lados del marketplace: lo que se puede saber de un modo SIN tocar la
// base ni la sesión.
//
// ⚠️ **Este archivo no puede importar nada de servidor.** Ni `prisma`, ni
// `@/auth`, ni `next/navigation`. Existe precisamente por eso: los botones del
// panel y el selector del perfil son componentes de cliente y necesitan
// `MODOS`, `ETIQUETA_MODO` y `modoEfectivo`. Cuando estas constantes vivían en
// `lib/modos.ts` —que sí importa Prisma— el bundler se llevaba Prisma al
// navegador, el módulo reventaba al evaluarse y los componentes NO SE
// HIDRATABAN: los botones se veían perfectos y no hacían absolutamente nada al
// pulsarlos. No daba ningún error al compilar.
//
// `lib/modos.ts` reexporta todo esto, así que el servidor puede seguir
// importando de donde siempre.

// Son DOS y solo dos. No existe un modo "ambos": el usuario está mirando un
// lado o el otro, y cambia con los dos botones que el panel tiene siempre
// abajo. Un tercer modo que enseñara las dos cosas a la vez volvería a poner
// delante la aplicación entera, que es justo lo que este diseño evita.
//
// Que solo se VEA un lado no impide hacer las dos cosas: se cambia en un clic y
// nada de lo publicado se toca. Sigue siendo una sola cuenta (PDR §4).
export const MODOS = ['busco', 'ofrezco'] as const
export type Modo = (typeof MODOS)[number]

export const esModo = (v: unknown): v is Modo => MODOS.includes(v as Modo)

// El lado de la demanda se dice "Busco", no "Necesito". Es la palabra que ya
// usa el menú ("Busco un servicio") y la que da nombre al propio modo, así que
// llamarlo de las dos formas obligaba al usuario a atar cabos.
export const ETIQUETA_MODO: Record<Modo, string> = {
  busco: 'Busco un servicio',
  ofrezco: 'Ofrezco un servicio',
}

/**
 * El modo con el que se trabaja de verdad.
 *
 * El lado se elige en la portada y se guarda al entrar, así que ninguna cuenta
 * nueva puede quedarse sin él. Pero en la base quedan cuentas viejas con `modo`
 * nulo o con el desaparecido `'ambos'`, y esas hay que leerlas como algo: se
 * leen como `busco`, que es el lado con el que llega la mayoría y el que no
 * presupone que el usuario tenga nada que ofrecer.
 *
 * No es una decisión que atrape a nadie: los dos botones del panel están
 * siempre a la vista. `scripts/migrar-modos.ts` lo deja además escrito.
 *
 * Ojo: se aplica solo al valor de un usuario que EXISTE. No sirve para tapar un
 * `findUnique` que no encontró nada — eso es un fallo, no un modo sin elegir.
 */
export const modoEfectivo = (modo: string | null | undefined): Modo =>
  esModo(modo) ? modo : 'busco'

/** ¿Está mirando el lado de la demanda (publicar necesidades)? */
export const puedeBuscar = (modo: string | null | undefined) => modoEfectivo(modo) === 'busco'

/** ¿Está mirando el lado de la oferta (publicar servicios y postularse)? */
export const puedeOfrecer = (modo: string | null | undefined) => modoEfectivo(modo) === 'ofrezco'

/** El otro lado: el del botón que no está activo. */
export const otroLado = (modo: string | null | undefined): Modo =>
  modoEfectivo(modo) === 'busco' ? 'ofrezco' : 'busco'

// Prefijos de ruta que pertenecen a cada lado. Lo que no está aquí (el panel,
// los trabajos, los créditos, el perfil y las notificaciones) es común: un
// trabajo y un crédito son los mismos se haya llegado por donde se haya
// llegado.
const RUTAS_BUSCO = ['/necesidades']
const RUTAS_OFREZCO = ['/servicios', '/postulaciones']

/**
 * ¿Puede este modo abrir esta ruta?
 *
 * Ocultar el enlace del menú no basta: quien escriba la dirección a mano
 * entraría igual, y se encontraría publicando en un lado que cree tener
 * apagado. Por eso las páginas llaman además a `exigirLado()`.
 */
export function rutaPermitida(modo: string | null | undefined, pathname: string): boolean {
  if (RUTAS_BUSCO.some((p) => pathname.startsWith(p))) return puedeBuscar(modo)
  if (RUTAS_OFREZCO.some((p) => pathname.startsWith(p))) return puedeOfrecer(modo)
  return true
}
