// Parámetros del sistema (tabla Configuracion). Todo lo que el admin puede
// encender/apagar o ajustar vive aquí, con un valor por defecto por si la fila
// todavía no existe.

import { prisma } from './db'

export const CONFIG_DEFAULTS: Record<string, string> = {
  plataforma_nombre: 'ConectaIA',
  plataforma_lema: 'Conectamos lo que necesitas con quien sabe hacerlo',

  // Registro abierto. En "0" solo el admin crea cuentas.
  registro_abierto: '1',
  // Créditos de regalo al registrarse. En "0" el usuario empieza sin saldo.
  creditos_bienvenida: '1',

  // Cuántos créditos cuesta desbloquear un contacto (PDR §14: 1 = 1).
  costo_desbloqueo: '1',

  // Recargas por Yape (PDR §29)
  yape_numero: '987 654 321',
  yape_titular: 'ConectaIA',
  // Ruta pública del QR de Yape (vacío = solo se muestra el número).
  yape_qr: '',

  // Matching (PDR §19). Puntaje mínimo para mostrar una coincidencia y cuántas
  // se listan por publicación.
  match_minimo: '40',
  match_max_resultados: '20',

  // Antievasión (PDR §24). En "1" se bloquea el guardado; en "0" solo se avisa
  // al admin sin impedir publicar.
  antievasion_bloquea: '1',
}

export type Config = Record<string, string>

export async function getConfig(): Promise<Config> {
  const filas = await prisma.configuracion.findMany().catch(() => [])
  const cfg: Config = { ...CONFIG_DEFAULTS }
  for (const f of filas) cfg[f.clave] = f.valor
  return cfg
}

export async function getValor(clave: string): Promise<string> {
  const fila = await prisma.configuracion.findUnique({ where: { clave } }).catch(() => null)
  return fila?.valor ?? CONFIG_DEFAULTS[clave] ?? ''
}

export async function setValor(clave: string, valor: string) {
  return prisma.configuracion.upsert({
    where: { clave },
    update: { valor },
    create: { clave, valor },
  })
}

// Crea las filas faltantes con su valor por defecto (útil en una BD sin seed).
export async function asegurarConfig() {
  for (const [clave, valor] of Object.entries(CONFIG_DEFAULTS)) {
    await prisma.configuracion.upsert({ where: { clave }, update: {}, create: { clave, valor } })
  }
}

export const esSi = (v: string | undefined) => v === '1' || v === 'true'

export const aNumero = (v: string | undefined, porDefecto: number) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : porDefecto
}
