/**
 * RUC peruano: exactamente 11 dígitos.
 *
 * ⚠️ Igual que `lib/dni.ts`, este archivo NO importa nada de servidor: lo usan
 * a la vez `POST /api/registro` y el formulario de registro, que es
 * `'use client'`. Arrastrar Prisma aquí dejaría el formulario sin hidratar.
 */

/** Cuántos dígitos tiene un RUC. Se usa también en el `maxLength` del campo. */
export const RUC_DIGITOS = 11

const FORMATO = /^\d{11}$/

export const ERROR_RUC = 'El RUC debe tener 11 dígitos'

/** Deja solo los dígitos, por si se escribe con espacios o guiones. */
export function normalizarRuc(v: unknown): string {
  return String(v ?? '').replace(/\D/g, '')
}

export function rucValido(v: string): boolean {
  return FORMATO.test(v)
}
