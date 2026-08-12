// Estados de las publicaciones y del trabajo (PDR §9), con su etiqueta y su
// color. Se centralizan aquí para que la misma palabra signifique lo mismo y
// se vea igual en todas las pantallas.

// `en_revision` y `rechazada` son la moderación previa: nada se publica sin que
// el administrador lo apruebe. Al pulsar "Publicar" NO se pasa a `publicada`,
// se pasa a `en_revision` y ahí se queda hasta que alguien lo mire.
//
// ⚠️ Un anuncio en revisión NO existe para el resto de la plataforma: el
// matching solo cruza lo publicado, el escaparate solo lista lo publicado y no
// se le pueden enviar ofertas. Eso sale gratis porque todas esas consultas
// filtran por `publicada`/`publicado` — pero por lo mismo, cualquier consulta
// nueva que use `estado !== 'borrador'` en vez de `estado === 'publicada'`
// dejaría ver lo que todavía no se ha aprobado.
export const ESTADOS_NECESIDAD = [
  'borrador',
  'en_revision',
  'rechazada',
  'publicada',
  'oferta_seleccionada',
  'en_proceso',
  'finalizada',
  'cancelada',
] as const

export const ESTADOS_SERVICIO = [
  'borrador',
  'en_revision',
  'rechazado',
  'publicado',
  'pausado',
  'desactivado',
] as const

type Pinta = { texto: string; clase: string }

const CHIP = {
  gris: 'bg-slate-100 border-slate-300 text-slate-600',
  marca: 'bg-marca-50 border-marca-200 text-marca-700',
  cielo: 'bg-cielo-100 border-cielo-300 text-cielo-700',
  menta: 'bg-menta-100 border-menta-300 text-menta-700',
  sol: 'bg-sol-100 border-sol-300 text-sol-700',
  rosa: 'bg-rose-50 border-rose-200 text-rose-700',
}

export const NECESIDAD: Record<string, Pinta> = {
  borrador: { texto: 'Borrador', clase: CHIP.gris },
  en_revision: { texto: 'En revisión', clase: CHIP.sol },
  rechazada: { texto: 'No aprobada', clase: CHIP.rosa },
  publicada: { texto: 'Publicada', clase: CHIP.marca },
  oferta_seleccionada: { texto: 'Oferta seleccionada', clase: CHIP.cielo },
  en_proceso: { texto: 'En proceso', clase: CHIP.sol },
  finalizada: { texto: 'Finalizada', clase: CHIP.menta },
  cancelada: { texto: 'Cancelada', clase: CHIP.rosa },
}

export const SERVICIO: Record<string, Pinta> = {
  borrador: { texto: 'Borrador', clase: CHIP.gris },
  en_revision: { texto: 'En revisión', clase: CHIP.sol },
  rechazado: { texto: 'No aprobado', clase: CHIP.rosa },
  publicado: { texto: 'Publicado', clase: CHIP.menta },
  pausado: { texto: 'Pausado', clase: CHIP.sol },
  desactivado: { texto: 'Desactivado', clase: CHIP.gris },
}

/**
 * Está esperando que el administrador lo mire. Se usa para pintar el aviso al
 * usuario y para contar el badge del menú del admin, y así los dos números
 * salen del mismo sitio.
 */
export const enRevision = (estado: string) => estado === 'en_revision'

/** No pasó la revisión. El dueño puede corregirlo y volver a enviarlo. */
export const rechazado = (estado: string) => estado === 'rechazada' || estado === 'rechazado'

export const POSTULACION: Record<string, Pinta> = {
  enviada: { texto: 'Esperando respuesta', clase: CHIP.marca },
  seleccionada: { texto: 'Seleccionada', clase: CHIP.menta },
  no_seleccionada: { texto: 'No seleccionada', clase: CHIP.gris },
  retirada: { texto: 'Retirada', clase: CHIP.gris },
}

export const TRABAJO: Record<string, Pinta> = {
  en_proceso: { texto: 'En proceso', clase: CHIP.sol },
  finalizado: { texto: 'Finalizado', clase: CHIP.menta },
  cancelado: { texto: 'Cancelado', clase: CHIP.rosa },
}

export const RECARGA: Record<string, Pinta> = {
  pendiente: { texto: 'Pendiente de revisión', clase: CHIP.sol },
  aprobada: { texto: 'Aprobada', clase: CHIP.menta },
  rechazada: { texto: 'Rechazada', clase: CHIP.rosa },
}

// Una necesidad solo recibe postulaciones mientras está PUBLICADA (PDR §11).
// Una en revisión todavía no existe para nadie más.
export const aceptaPostulaciones = (estado: string) => estado === 'publicada'

// Se puede editar mientras nadie haya sido seleccionado: después, cambiar el
// precio o el alcance del trabajo dejaría sin sentido la oferta ya aceptada.
// Lo rechazado se edita a propósito — es justo lo que hay que hacer con ello.
export const editable = (estado: string) =>
  estado === 'borrador' ||
  estado === 'publicada' ||
  estado === 'en_revision' ||
  estado === 'rechazada'

// Cancelar sin coste solo antes de seleccionar (PDR §33).
export const cancelableSinCoste = (estado: string) =>
  estado === 'borrador' ||
  estado === 'publicada' ||
  estado === 'en_revision' ||
  estado === 'rechazada'
