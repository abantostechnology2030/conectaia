// Para cuándo se necesita el servicio.
//
// Antes esto era un calendario a secas, y era pedir un dato que el usuario no
// tiene: quien necesita que le arreglen un caño no piensa "el 14 de marzo",
// piensa "cuanto antes". Un campo de fecha obliga a inventarse una, y una fecha
// inventada es peor que ningún dato, porque el proveedor la toma en serio.
//
// La opción "flexible" no sobra: si todas las opciones implican prisa, todo el
// mundo marca la más urgente y el dato deja de distinguir nada. Poder decir "no
// corre prisa" es lo que permite que un profesional con la semana llena se
// postule igual.
//
// ⚠️ Sin imports de servidor: `NecesidadForm` es un componente de cliente.

export const URGENCIAS = [
  'cuanto_antes',
  'esta_semana',
  'proxima_semana',
  'flexible',
  'fecha_fija',
] as const

export type Urgencia = (typeof URGENCIAS)[number]

export const esUrgencia = (v: unknown): v is Urgencia => URGENCIAS.includes(v as Urgencia)

export const URGENCIA: Record<
  Urgencia,
  { etiqueta: string; ayuda: string; emoji: string; clase: string }
> = {
  cuanto_antes: {
    etiqueta: 'Cuanto antes',
    ayuda: 'Es urgente',
    emoji: '⚡',
    clase: 'border-rose-300 bg-rose-50 text-rose-700',
  },
  esta_semana: {
    etiqueta: 'Esta semana',
    ayuda: 'En los próximos días',
    emoji: '📅',
    clase: 'border-durazno-300 bg-durazno-50 text-durazno-700',
  },
  proxima_semana: {
    etiqueta: 'La próxima semana',
    ayuda: 'Hay algo de margen',
    emoji: '🗓️',
    clase: 'border-sol-300 bg-sol-50 text-sol-800',
  },
  flexible: {
    etiqueta: 'Sin apuro',
    ayuda: 'Cuando se pueda coordinar',
    emoji: '🌤️',
    clase: 'border-slate-300 bg-slate-50 text-slate-600',
  },
  fecha_fija: {
    etiqueta: 'Una fecha exacta',
    ayuda: 'Tengo un día concreto',
    emoji: '📌',
    clase: 'border-cielo-300 bg-cielo-50 text-cielo-700',
  },
}

/**
 * Qué escribir en la ficha, en un solo sitio para que las cuatro pantallas que
 * lo enseñan digan exactamente lo mismo.
 *
 * `fechaTexto` llega ya formateado por `lib/fechas.ts`: así este archivo no
 * necesita saber nada de formatos ni de zonas horarias.
 */
export function cuando(
  urgencia: string | null | undefined,
  fechaTexto: string | null,
): { etiqueta: string; valor: string } | null {
  if (esUrgencia(urgencia)) {
    // Con fecha exacta manda la fecha; la etiqueta sola no diría cuál.
    if (urgencia === 'fecha_fija' && fechaTexto) {
      return { etiqueta: 'Fecha deseada', valor: fechaTexto }
    }
    return { etiqueta: 'Para cuándo', valor: URGENCIA[urgencia].etiqueta }
  }

  // Necesidades anteriores a este campo: solo tienen fecha.
  if (fechaTexto) return { etiqueta: 'Fecha deseada', valor: fechaTexto }

  return null
}
