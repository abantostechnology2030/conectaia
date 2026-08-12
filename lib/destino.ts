// Destino al que volver después de iniciar sesión, y a dónde llevan las dos
// puertas de la portada.
//
// Quien ya tiene cuenta ya eligió su lado al crearla, así que iniciar sesión lo
// deja siempre en su panel: no hay nada que preguntarle ni ningún sitio
// especial al que mandarlo. `destinoSeguro` sigue aquí porque cualquier enlace
// puede traer un `?destino=`, y ese parámetro nunca se puede usar tal cual.

/**
 * Solo se acepta una ruta interna. Sin esta comprobación, un enlace del tipo
 * `/login?destino=https://otro-sitio` convertiría el login en un trampolín para
 * llevarse a la gente a otra página después de escribir su contraseña.
 */
export function destinoSeguro(valor: string | null | undefined, porDefecto = '/panel'): string {
  if (!valor) return porDefecto
  if (!valor.startsWith('/')) return porDefecto
  // `//otro-sitio` y `/\otro-sitio` los interpreta el navegador como absolutas.
  if (valor.startsWith('//') || valor.startsWith('/\\')) return porDefecto
  return valor
}

/**
 * Enlace de una de las dos puertas de la portada.
 *
 * Sin sesión, las dos llevan al MISMO login, cada una arrastrando el lado
 * elegido (`/login?lado=busco`). El login no pregunta nada: la elección ya está
 * hecha aquí, y al entrar se guarda y se abre ese panel.
 *
 * Con sesión llevan al panel a secas. Quien ya está dentro cambia de lado con
 * los dos botones que el panel tiene siempre abajo, no volviendo a la portada:
 * así ninguna dirección escrita en la barra cambia datos por el hecho de
 * abrirla.
 */
export function puerta(lado: 'busco' | 'ofrezco', haySesion: boolean, panel = '/panel'): string {
  return haySesion ? panel : `/login?lado=${lado}`
}

/** El `?lado=` de un enlace, solo si es uno de los dos que existen. */
export function ladoSeguro(valor: string | null | undefined): 'busco' | 'ofrezco' | undefined {
  return valor === 'busco' || valor === 'ofrezco' ? valor : undefined
}
