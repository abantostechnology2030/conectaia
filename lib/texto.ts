// Normalización de texto para el matching.
//
// Todo lo que se compara entre una necesidad y un servicio pasa por aquí:
// "Cajamarca" y "cajamarca", "Pintura de Interiores" y "pintura interiores"
// tienen que casar. SQLite no trae búsqueda de texto completo ni una función
// para quitar tildes, así que se normaliza en JavaScript AL GUARDAR y se
// almacena el resultado en la columna `claves`.

// Palabras que aparecen en casi cualquier publicación y no distinguen nada:
// si contaran, todo casaría con todo.
const VACIAS = new Set([
  'a','al','algo','ante','antes','aqui','asi','aun','bien','cada','como','con','contra','cual',
  'cuando','de','del','desde','donde','dos','el','ella','ellos','en','entre','era','es','esa',
  'ese','eso','esta','este','esto','ha','hace','hacer','hasta','hay','la','las','le','les','lo',
  'los','mas','me','mi','mis','mucho','muy','no','nos','o','otra','otro','para','pero','poco',
  'por','porque','que','quien','se','segun','ser','si','sin','sobre','solo','son','su','sus',
  'tambien','tanto','te','tiene','todo','todos','tu','un','una','uno','unos','y','ya','yo',
  // ruido propio del dominio: están en todas las publicaciones
  'servicio','servicios','trabajo','trabajos','necesito','ofrezco','busco','realizo','hago',
  'soles','precio','zona','experiencia','anos',
])

// Marcas de acentuación que deja `normalize('NFD')`. Se construye con
// `new RegExp` a partir de escapes ASCII a propósito: escrito como literal, el
// rango son caracteres combinantes invisibles en el código fuente, y cualquier
// editor o herramienta que reescriba el archivo con otra codificación lo
// rompe sin dar ningún error.
const TILDES = new RegExp('[\u0300-\u036f]', 'g')

// minúsculas, sin tildes, sin signos
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(TILDES, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Palabras significativas de un texto, sin repetir y sin las vacías.
export function palabras(texto: string): string[] {
  return [...new Set(normalizar(texto).split(' '))].filter((p) => p.length > 2 && !VACIAS.has(p))
}

// Cadena de claves que se guarda en Necesidad.claves / Servicio.claves.
export function construirClaves(...partes: (string | null | undefined)[]): string {
  return palabras(partes.filter(Boolean).join(' ')).join(' ')
}

// Cuánto se parecen dos conjuntos de claves, de 0 a 1. Se divide entre el
// conjunto MÁS PEQUEÑO (y no entre la unión, como haría Jaccard) para que una
// necesidad de dos líneas no salga penalizada frente a un servicio con una
// descripción larguísima: lo que importa es cuánto de la más corta aparece en
// la otra.
export function similitud(clavesA: string, clavesB: string): number {
  const a = new Set(clavesA.split(' ').filter(Boolean))
  const b = new Set(clavesB.split(' ').filter(Boolean))
  if (a.size === 0 || b.size === 0) return 0
  let comunes = 0
  for (const p of a) if (b.has(p)) comunes++
  return comunes / Math.min(a.size, b.size)
}

// Compara ubicaciones. Devuelve true si son la misma ciudad.
// Se compara normalizado porque la gente escribe "Cajamarca " y "cajamarca".
export function mismaCiudad(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  return normalizar(a) === normalizar(b)
}

// Recorta un texto para mostrarlo en tarjetas y avisos.
export function recortar(texto: string, largo = 160): string {
  const limpio = texto.trim()
  return limpio.length <= largo ? limpio : `${limpio.slice(0, largo).trimEnd()}…`
}
