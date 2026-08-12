// Fechas y horas en formato peruano, con el mismo aspecto en toda la app.
// El servidor renderiza estas cadenas, así que no dependen de la zona horaria
// del navegador: salen todas con la del servidor y no bailan entre pantallas.

const OPCIONES_FECHA: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
}

const OPCIONES_HORA: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
}

// 07/08/2026
export function fecha(d: Date | null | undefined, vacio = '—'): string {
  return d ? d.toLocaleDateString('es-PE', OPCIONES_FECHA) : vacio
}

// 07/08/2026 · 03:45 p. m.
export function fechaHora(d: Date | null | undefined, vacio = '—'): string {
  if (!d) return vacio
  return `${d.toLocaleDateString('es-PE', OPCIONES_FECHA)} · ${d.toLocaleTimeString('es-PE', OPCIONES_HORA)}`
}

// 07/08/26 — para tarjetas y celdas estrechas
export function fechaCorta(d: Date | null | undefined, vacio = '—'): string {
  return d
    ? d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit' })
    : vacio
}

// La fecha de hace N días, para los filtros de "últimos 30 días" del panel
// del admin. Vive aquí y no en la página porque la regla de pureza de React
// prohíbe llamar a `Date.now()` dentro del cuerpo de un componente.
export function haceDias(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
}

// "hace 3 días" — para listas de notificaciones y oportunidades.
export function hace(d: Date | null | undefined): string {
  if (!d) return '—'
  const seg = Math.floor((Date.now() - d.getTime()) / 1000)
  if (seg < 60) return 'hace un momento'
  const min = Math.floor(seg / 60)
  if (min < 60) return `hace ${min} min`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `hace ${hrs} h`
  const dias = Math.floor(hrs / 24)
  if (dias < 30) return `hace ${dias} día${dias === 1 ? '' : 's'}`
  const meses = Math.floor(dias / 30)
  if (meses < 12) return `hace ${meses} mes${meses === 1 ? '' : 'es'}`
  const anios = Math.floor(meses / 12)
  return `hace ${anios} año${anios === 1 ? '' : 's'}`
}

// "Miembro desde agosto de 2026" — antigüedad del perfil (PDR §25).
export function antiguedad(d: Date): string {
  return d.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
}

// S/ 100.00 — un solo formato de precio en toda la app.
export function soles(n: number | null | undefined, vacio = 'A convenir'): string {
  if (n === null || n === undefined) return vacio
  return `S/ ${n.toFixed(2)}`
}
