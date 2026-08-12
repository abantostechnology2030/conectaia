// Antievasión del sistema de créditos (PDR §24).
//
// La plataforma cobra por desbloquear un contacto, así que publicar el celular
// dentro de la descripción es saltarse el único cobro que existe. Aquí se
// detectan los intentos EVIDENTES; no pretende ser infalible (quien quiera
// evadir siempre encontrará una forma), sino cerrar lo obvio y dejar rastro
// para el administrador.
//
// La regla la fija el PDR: "no permitir que los usuarios utilicen la
// plataforma para obtener contactos gratuitamente mediante mecanismos
// evidentes de evasión".

import { normalizar } from './texto'

export type Hallazgo = { patron: string; detalle: string }

// Los números escritos con letras ("nueve ocho siete...") son el truco más
// común para esquivar una detección por dígitos.
const DIGITOS_EN_LETRAS: Record<string, string> = {
  cero: '0', uno: '1', dos: '2', tres: '3', cuatro: '4',
  cinco: '5', seis: '6', siete: '7', ocho: '8', nueve: '9',
}

// Convierte "nueve ocho siete seis" en "9876" para que la regla de teléfono lo
// vea. Solo une secuencias de 3 o más números seguidos escritos con letras:
// menos que eso es lenguaje normal ("dos habitaciones", "tres horas").
function digitosEscritos(texto: string): string {
  const palabras = normalizar(texto).split(' ')
  let salida = ''
  let racha: string[] = []

  const volcar = () => {
    if (racha.length >= 3) salida += ` ${racha.join('')}`
    racha = []
  }

  for (const p of palabras) {
    const d = DIGITOS_EN_LETRAS[p]
    if (d) racha.push(d)
    else volcar()
  }
  volcar()
  return salida
}

// Deja solo los dígitos para atrapar "9 8 7 - 6 5 4" y "987.654.321".
const soloDigitos = (t: string) => t.replace(/[^\d]/g, '')

const REGLAS: { nombre: string; detalle: string; prueba: (texto: string, plano: string) => boolean }[] = [
  {
    nombre: 'telefono',
    detalle: 'Parece un número de teléfono o de WhatsApp',
    // Un celular peruano son 9 dígitos y empieza por 9. Se exige esa forma para
    // no confundirlo con precios ni metros cuadrados. También se aceptan
    // secuencias de 9+ dígitos seguidos, vengan como vengan.
    prueba: (_t, plano) => /9\d{8}/.test(plano) || /\d{9,}/.test(plano),
  },
  {
    nombre: 'email',
    detalle: 'Parece un correo electrónico',
    prueba: (t) => /[\w.+-]+\s*(@|\(at\)|\[at\]|\sarroba\s)\s*[\w-]+\s*(\.|\spunto\s)\s*[a-z]{2,}/i.test(t),
  },
  {
    nombre: 'red_social',
    detalle: 'Parece un enlace o usuario de una red social',
    prueba: (t) =>
      /(whatsapp|wasap|wsp|w\.?a\.?t?s?a?p?p?|facebook|fb\.com|instagram|ig\s|tiktok|telegram|t\.me|messenger)/i.test(t) ||
      /(https?:\/\/|www\.)/i.test(t) ||
      /@[a-z0-9_.]{4,}/i.test(t),
  },
  {
    nombre: 'salida_de_plataforma',
    detalle: 'Invita a continuar la conversación fuera de ConectaIA',
    prueba: (t) => {
      const n = normalizar(t)
      return /(escribeme|llamame|contactame|comunicate|mi numero|mi celular|mi cel|mi correo|mi whatsapp|fuera de la (app|plataforma|pagina)|por afuera|te paso mi|pasame tu|dame tu numero|coordinamos por)/.test(n)
    },
  },
]

// Analiza un texto y devuelve todo lo que parece un intento de evasión.
export function analizar(texto: string | null | undefined): Hallazgo[] {
  if (!texto || !texto.trim()) return []

  // Se examina el texto tal cual Y con los números escritos con letras ya
  // convertidos a dígitos, para que ambos trucos caigan con las mismas reglas.
  const conNumeros = `${texto} ${digitosEscritos(texto)}`
  const plano = soloDigitos(conNumeros)

  return REGLAS.filter((r) => r.prueba(conNumeros, plano)).map((r) => ({
    patron: r.nombre,
    detalle: r.detalle,
  }))
}

// Mensaje que se le enseña al usuario cuando se le bloquea el guardado.
export function mensajeBloqueo(hallazgos: Hallazgo[]): string {
  const lista = hallazgos.map((h) => `• ${h.detalle}`).join('\n')
  return (
    'No podemos publicar este texto porque incluye datos de contacto:\n' +
    lista +
    '\n\nEn ConectaIA los datos de contacto se comparten solos cuando se acepta una oferta o se desbloquea una oportunidad. Quita esa información y vuelve a intentarlo.'
  )
}
