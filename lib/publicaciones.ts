// Lectura y validación de los formularios de NECESIDAD y SERVICIO.
//
// Los dos formularios llegan como `multipart/form-data` (llevan fotos), así
// que el trabajo de convertir cadenas a números y fechas se hace una sola vez
// aquí en lugar de repetirse en cada ruta.

import { prisma } from './db'
import { guardarImagen, borrarImagen } from './uploads'
import { construirClaves } from './texto'
import { esUrgencia, type Urgencia } from './urgencia'

const MAX_FOTOS = 5

export const texto = (v: FormDataEntryValue | null) => String(v ?? '').trim()

export const textoOpcional = (v: FormDataEntryValue | null) => {
  const t = texto(v)
  return t === '' ? null : t
}

export function numeroOpcional(v: FormDataEntryValue | null): number | null {
  const t = texto(v)
  if (t === '') return null
  const n = Number(t.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : null
}

export function fechaOpcional(v: FormDataEntryValue | null): Date | null {
  const t = texto(v)
  if (t === '') return null
  const d = new Date(t)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Para cuándo se necesita: los dos campos salen SIEMPRE juntos de aquí.
 *
 * La fecha solo se guarda si la urgencia elegida es "fecha_fija". Si se
 * calcularan por separado, editar una necesidad de "el 14 de marzo" a "cuanto
 * antes" dejaría la fecha vieja en la base: invisible en la ficha, pero ahí, y
 * reapareciendo en cuanto alguien volviera a marcar "fecha exacta".
 *
 * Una urgencia que no existe se descarta en vez de rechazar el formulario: el
 * campo es opcional y no vale la pena perder una publicación por él.
 */
export function cuandoSeNecesita(form: FormData): {
  urgencia: Urgencia | null
  fechaDeseada: Date | null
} {
  const v = texto(form.get('urgencia'))
  const urgencia = esUrgencia(v) ? v : null

  return {
    urgencia,
    fechaDeseada: urgencia === 'fecha_fija' ? fechaOpcional(form.get('fechaDeseada')) : null,
  }
}

/**
 * Subcategoría: la de la lista, o la que el usuario escribió en "Otro".
 *
 * Los dos campos salen SIEMPRE juntos de aquí porque son **excluyentes**. Si se
 * calcularan por separado, pasar una publicación de "Otro: pintura epóxica" a
 * una subcategoría normal dejaría el texto viejo en la base: invisible en la
 * ficha, pero ahí, y reapareciendo en cuanto alguien volviera a marcar "Otro".
 * Es el mismo problema que ya tuvo `fechaDeseada` con la urgencia.
 *
 * La lista la fija el administrador y nunca lo cubre todo. Sin esta salida,
 * quien no se ve reflejado elige la subcategoría que más se le parece —y
 * ensucia el matching de esa otra— o deja el campo vacío y pierde la mitad de
 * los 15 puntos de subcategoría.
 */
export function subcategoriaElegida(form: FormData): {
  subcategoriaId: number | null
  subcategoriaOtra: string | null
} {
  const otra = textoOpcional(form.get('subcategoriaOtra'))
  if (otra) return { subcategoriaId: null, subcategoriaOtra: otra.slice(0, 60) }

  const id = Number(form.get('subcategoriaId'))
  return {
    subcategoriaId: Number.isInteger(id) && id > 0 ? id : null,
    subcategoriaOtra: null,
  }
}

/** Comprueba que la categoría exista y que la subcategoría sea suya. */
export async function validarCategoria(
  categoriaId: number,
  subcategoriaId: number | null,
): Promise<string | null> {
  if (!categoriaId) return 'Elige una categoría'

  const cat = await prisma.categoria.findUnique({ where: { id: categoriaId } })
  if (!cat || !cat.activa) return 'Esa categoría no está disponible'

  if (subcategoriaId) {
    const sub = await prisma.subcategoria.findUnique({ where: { id: subcategoriaId } })
    // Una subcategoría de otra categoría rompería el matching sin dar ningún
    // error visible, así que se comprueba la pertenencia y no solo que exista.
    if (!sub || sub.categoriaId !== categoriaId) return 'Esa subcategoría no pertenece a la categoría elegida'
  }

  return null
}

/**
 * Guarda las fotos nuevas de una publicación, respetando el máximo.
 * Devuelve cuántas se guardaron.
 */
export async function guardarFotos(
  form: FormData,
  destino: { necesidadId?: number; servicioId?: number; usuarioId?: number },
  carpeta: string,
): Promise<number> {
  const archivos = form.getAll('fotos').filter((f): f is File => f instanceof File && f.size > 0)
  if (archivos.length === 0) return 0

  const yaHay = await prisma.foto.count({ where: destino })
  const cupo = Math.max(0, MAX_FOTOS - yaHay)
  if (cupo === 0) return 0

  const base = destino.necesidadId
    ? `n${destino.necesidadId}`
    : destino.servicioId
      ? `s${destino.servicioId}`
      : `u${destino.usuarioId}`
  let guardadas = 0

  for (const [i, archivo] of archivos.slice(0, cupo).entries()) {
    // Una foto con mal formato no debe tumbar el guardado entero de la
    // publicación: se salta y se sigue con las demás.
    try {
      const url = await guardarImagen(archivo, carpeta, base)
      await prisma.foto.create({ data: { ...destino, url, orden: yaHay + i } })
      guardadas++
    } catch (e) {
      console.error('[fotos] no se pudo guardar una imagen:', (e as Error).message)
    }
  }

  return guardadas
}

/** Borra una foto (fila + archivo), comprobando antes de quién es. */
export async function borrarFoto(fotoId: number, usuarioId: number): Promise<boolean> {
  const foto = await prisma.foto.findUnique({
    where: { id: fotoId },
    include: { necesidad: { select: { usuarioId: true } }, servicio: { select: { usuarioId: true } } },
  })
  if (!foto) return false

  // Una foto de perfil no pasa por `necesidad` ni `servicio`: es dueña de sí
  // misma vía `usuarioId` directo.
  const dueno = foto.necesidad?.usuarioId ?? foto.servicio?.usuarioId ?? foto.usuarioId
  if (dueno !== usuarioId) return false

  await prisma.foto.delete({ where: { id: fotoId } })
  await borrarImagen(foto.url)
  return true
}

/** Claves de búsqueda de una necesidad (ver lib/texto.ts). */
export function clavesNecesidad(d: {
  titulo: string
  descripcion: string
  categoria: string
  subcategoria?: string | null
  observaciones?: string | null
}) {
  return construirClaves(d.titulo, d.descripcion, d.categoria, d.subcategoria, d.observaciones)
}

/** Claves de búsqueda de un servicio. */
export function clavesServicio(d: {
  nombre: string
  descripcion: string
  categoria: string
  subcategoria?: string | null
  experiencia?: string | null
  observaciones?: string | null
}) {
  return construirClaves(
    d.nombre,
    d.descripcion,
    d.categoria,
    d.subcategoria,
    d.experiencia,
    d.observaciones,
  )
}

export { MAX_FOTOS }
