/**
 * DNI peruano: exactamente 8 dígitos.
 *
 * ⚠️ Este archivo NO importa nada de servidor, y es a propósito: lo usan a la
 * vez la ruta `POST /api/registro` y el formulario de registro, que es
 * `'use client'`. Si viviera dentro de un módulo que arrastre Prisma, el
 * bundler se lo llevaría al navegador y el formulario nunca se hidrataría —
 * el mismo fallo mudo que ya costó los botones de `SelectorLado` (ver la
 * separación entre `lib/lados.ts` y `lib/modos.ts`).
 */

/** Cuántos dígitos tiene un DNI. Se usa también en el `maxLength` del campo. */
export const DNI_DIGITOS = 8

const FORMATO = /^\d{8}$/

/** El mismo texto en la API y en la ayuda del campo, para no decir dos cosas. */
export const ERROR_DNI = 'El DNI debe tener 8 dígitos'

/**
 * Deja solo los dígitos: la gente lo escribe con espacios, puntos o guiones, y
 * un "12 345 678" que se rechaza por el formato es una barrera inventada.
 */
export function normalizarDni(v: unknown): string {
  return String(v ?? '').replace(/\D/g, '')
}

export function dniValido(v: string): boolean {
  return FORMATO.test(v)
}
