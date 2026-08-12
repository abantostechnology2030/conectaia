// Matching estructurado entre NECESIDADES y SERVICIOS (PDR §17-19, §44).
//
// Sin IA, a propósito: el PDR pide que la primera versión funcione con
// coincidencias estructuradas y que la arquitectura permita cambiar el motor
// más adelante. Todo el cálculo vive en `puntuar()`, así que sustituirlo por
// un modelo solo obliga a tocar este archivo.
//
// El puntaje es de 0 a 100 y suma seis factores. Los pesos siguen el orden de
// importancia del PDR §19:
//
//   categoría      35  — si no coinciden, no hay nada que hablar
//   subcategoría   15
//   ubicación      20  — un pintor de Lima no le sirve a nadie en Cajamarca
//   precio         15
//   palabras clave 10
//   disponibilidad  5  — reputación y actividad de quien ofrece
//
// El ejemplo del PDR §45 (pintura + Cajamarca + S/100 vs "desde S/80") da
// 35+15+20+15+~7+~2 ≈ 94, que es la cifra que usa como ilustración.

import { prisma } from './db'
import { getValor, aNumero } from './config'
import { mismaCiudad, similitud } from './texto'

export const PESOS = {
  categoria: 35,
  subcategoria: 15,
  ubicacion: 20,
  precio: 15,
  claves: 10,
  disponibilidad: 5,
} as const

export type Publicacion = {
  categoriaId: number
  subcategoriaId: number | null
  ciudad: string
  claves: string
}

export type LadoNecesidad = Publicacion & { precioOfrecido: number | null }
export type LadoServicio = Publicacion & {
  precioDesde: number | null
  disponibilidad?: string | null
  reputacion?: number | null
}

export type Detalle = {
  puntaje: number
  factores: { nombre: string; puntos: number; maximo: number; nota: string }[]
}

/** Puntúa una necesidad contra un servicio. Devuelve el desglose completo. */
export function puntuar(n: LadoNecesidad, s: LadoServicio): Detalle {
  const factores: Detalle['factores'] = []

  // 1. Categoría — todo o nada.
  const catOk = n.categoriaId === s.categoriaId
  factores.push({
    nombre: 'Categoría',
    puntos: catOk ? PESOS.categoria : 0,
    maximo: PESOS.categoria,
    nota: catOk ? 'Misma categoría' : 'Categoría distinta',
  })

  // 2. Subcategoría — si alguno de los dos no la declaró, se da la mitad: no
  // es una discrepancia, es un dato que falta, y castigarlo como si fuera un
  // desacuerdo dejaría fuera publicaciones que sí sirven.
  let subPuntos = 0
  let subNota = 'Subcategoría distinta'
  if (n.subcategoriaId && s.subcategoriaId) {
    if (n.subcategoriaId === s.subcategoriaId) {
      subPuntos = PESOS.subcategoria
      subNota = 'Misma subcategoría'
    }
  } else {
    subPuntos = PESOS.subcategoria / 2
    subNota = 'Sin subcategoría declarada'
  }
  factores.push({ nombre: 'Subcategoría', puntos: subPuntos, maximo: PESOS.subcategoria, nota: subNota })

  // 3. Ubicación — misma ciudad o nada.
  const ubiOk = mismaCiudad(n.ciudad, s.ciudad)
  factores.push({
    nombre: 'Ubicación',
    puntos: ubiOk ? PESOS.ubicacion : 0,
    maximo: PESOS.ubicacion,
    nota: ubiOk ? `Ambos en ${n.ciudad}` : 'Ciudades distintas',
  })

  // 4. Precio — el "desde" del servicio contra lo que ofrece la necesidad.
  //    Si el servicio arranca por debajo del presupuesto, encaja del todo.
  //    Por encima, se va perdiendo puntaje hasta el doble del presupuesto.
  let precioPuntos = 0
  let precioNota = 'Sin precio declarado'
  if (n.precioOfrecido != null && s.precioDesde != null) {
    if (s.precioDesde <= n.precioOfrecido) {
      precioPuntos = PESOS.precio
      precioNota = 'Presupuesto compatible'
    } else {
      const exceso = (s.precioDesde - n.precioOfrecido) / n.precioOfrecido
      precioPuntos = Math.max(0, PESOS.precio * (1 - exceso))
      precioNota =
        precioPuntos > 0
          ? `El servicio parte un ${Math.round(exceso * 100)}% por encima`
          : 'Muy por encima del presupuesto'
    }
  } else {
    // Sin precio en alguno de los dos lados no se puede comparar; se da la
    // mitad por el mismo motivo que en subcategoría.
    precioPuntos = PESOS.precio / 2
  }
  factores.push({ nombre: 'Precio', puntos: precioPuntos, maximo: PESOS.precio, nota: precioNota })

  // 5. Palabras clave — cuánto se solapan las descripciones.
  const sim = similitud(n.claves, s.claves)
  factores.push({
    nombre: 'Descripción',
    puntos: PESOS.claves * sim,
    maximo: PESOS.claves,
    nota: sim > 0.5 ? 'Descripciones muy parecidas' : sim > 0 ? 'Algunas palabras en común' : 'Sin palabras en común',
  })

  // 6. Disponibilidad y reputación de quien ofrece el servicio.
  const tieneDisp = !!s.disponibilidad?.trim()
  const rep = s.reputacion ?? 0
  const dispPuntos =
    (tieneDisp ? PESOS.disponibilidad * 0.4 : 0) + (rep > 0 ? PESOS.disponibilidad * 0.6 * (rep / 5) : 0)
  factores.push({
    nombre: 'Disponibilidad',
    puntos: dispPuntos,
    maximo: PESOS.disponibilidad,
    nota: rep > 0 ? `Calificación ${rep.toFixed(1)} ★` : tieneDisp ? 'Disponibilidad declarada' : 'Sin datos aún',
  })

  const puntaje = Math.round(factores.reduce((t, f) => t + f.puntos, 0))
  return { puntaje: Math.min(100, Math.max(0, puntaje)), factores }
}

// Reputación media de cada usuario, en una sola consulta. Se usa en el bucle
// de matching para no pedir la media usuario por usuario.
async function reputaciones(ids: number[]): Promise<Map<number, number>> {
  if (ids.length === 0) return new Map()
  const filas = await prisma.calificacion.groupBy({
    by: ['destinatarioId'],
    where: { destinatarioId: { in: ids }, oculta: false },
    _avg: { estrellas: true },
  })
  return new Map(filas.map((f) => [f.destinatarioId, f._avg.estrellas ?? 0]))
}

/**
 * Recalcula las coincidencias de UNA necesidad contra todos los servicios
 * publicados, y las guarda. Se llama al publicar o editar una necesidad.
 *
 * Solo se comparan servicios de la MISMA CATEGORÍA: sin ese filtro habría que
 * puntuar la tabla entera contra cada publicación, y sin categoría común el
 * puntaje nunca llegaría al mínimo de todos modos.
 */
export async function recalcularParaNecesidad(necesidadId: number): Promise<number> {
  const n = await prisma.necesidad.findUnique({ where: { id: necesidadId } })
  if (!n || n.estado !== 'publicada') return 0

  const servicios = await prisma.servicio.findMany({
    where: { estado: 'publicado', categoriaId: n.categoriaId, usuarioId: { not: n.usuarioId } },
  })

  const reps = await reputaciones(servicios.map((s) => s.usuarioId))
  const minimo = aNumero(await getValor('match_minimo'), 40)
  let guardados = 0

  for (const s of servicios) {
    const { puntaje } = puntuar(
      { ...n, precioOfrecido: n.precioOfrecido },
      { ...s, precioDesde: s.precioDesde, reputacion: reps.get(s.usuarioId) ?? 0 },
    )
    if (puntaje < minimo) continue

    // `update` solo del puntaje: `vistoAt`, `postuloAt` y `contactoAt` son
    // historia y no se pisan al recalcular.
    await prisma.match.upsert({
      where: { necesidadId_servicioId: { necesidadId: n.id, servicioId: s.id } },
      update: { puntaje },
      create: { necesidadId: n.id, servicioId: s.id, puntaje },
    })
    guardados++
  }

  return guardados
}

/** Lo mismo en sentido inverso: un servicio contra todas las necesidades. */
export async function recalcularParaServicio(servicioId: number): Promise<number> {
  const s = await prisma.servicio.findUnique({ where: { id: servicioId } })
  if (!s || s.estado !== 'publicado') return 0

  const necesidades = await prisma.necesidad.findMany({
    where: { estado: 'publicada', categoriaId: s.categoriaId, usuarioId: { not: s.usuarioId } },
  })

  const rep = (await reputaciones([s.usuarioId])).get(s.usuarioId) ?? 0
  const minimo = aNumero(await getValor('match_minimo'), 40)
  let guardados = 0

  for (const n of necesidades) {
    const { puntaje } = puntuar(
      { ...n, precioOfrecido: n.precioOfrecido },
      { ...s, precioDesde: s.precioDesde, reputacion: rep },
    )
    if (puntaje < minimo) continue

    await prisma.match.upsert({
      where: { necesidadId_servicioId: { necesidadId: n.id, servicioId: s.id } },
      update: { puntaje },
      create: { necesidadId: n.id, servicioId: s.id, puntaje },
    })
    guardados++
  }

  return guardados
}

// Etiqueta de compatibilidad para la interfaz.
export function nivelMatch(puntaje: number): { texto: string; clase: string } {
  if (puntaje >= 80) return { texto: 'Compatibilidad alta', clase: 'bg-menta-100 border-menta-300 text-menta-700' }
  if (puntaje >= 60) return { texto: 'Compatibilidad media', clase: 'bg-sol-100 border-sol-300 text-sol-700' }
  return { texto: 'Compatibilidad baja', clase: 'bg-slate-100 border-slate-300 text-slate-600' }
}
