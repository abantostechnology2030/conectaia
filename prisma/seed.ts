import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '../app/generated/prisma'
import { CONFIG_DEFAULTS } from '../lib/config'
import { construirClaves } from '../lib/texto'

const prisma = new PrismaClient()

// Catálogo inicial de oficios. Es el punto de partida que el admin edita
// desde /admin/categorias; no pretende ser exhaustivo.
const CATALOGO: { nombre: string; icono: string; subs: string[] }[] = [
  { nombre: 'Pintura', icono: '🎨', subs: ['Pintura de interiores', 'Pintura de exteriores', 'Empastado y resanado', 'Pintura decorativa'] },
  { nombre: 'Gasfitería', icono: '🚰', subs: ['Reparación de fugas', 'Instalación de sanitarios', 'Desatoros', 'Instalación de tuberías'] },
  { nombre: 'Electricidad', icono: '💡', subs: ['Instalaciones eléctricas', 'Reparación de tableros', 'Iluminación', 'Pozo a tierra'] },
  { nombre: 'Carpintería', icono: '🪚', subs: ['Muebles a medida', 'Puertas y ventanas', 'Reparación de muebles', 'Melamina'] },
  { nombre: 'Albañilería', icono: '🧱', subs: ['Construcción', 'Tarrajeo', 'Pisos y cerámica', 'Techos'] },
  { nombre: 'Limpieza', icono: '🧹', subs: ['Limpieza de casas', 'Limpieza de oficinas', 'Limpieza profunda', 'Lavado de muebles'] },
  { nombre: 'Cerrajería', icono: '🔐', subs: ['Apertura de puertas', 'Cambio de cerraduras', 'Duplicado de llaves'] },
  { nombre: 'Jardinería', icono: '🌿', subs: ['Mantenimiento de jardines', 'Poda de árboles', 'Diseño de jardines'] },
  { nombre: 'Tecnología', icono: '💻', subs: ['Reparación de computadoras', 'Redes e internet', 'Cámaras de seguridad', 'Soporte técnico'] },
  { nombre: 'Mudanzas y transporte', icono: '🚚', subs: ['Mudanzas', 'Transporte de carga', 'Delivery'] },
  { nombre: 'Belleza y cuidado', icono: '💇', subs: ['Peluquería a domicilio', 'Manicure y pedicure', 'Maquillaje'] },
  { nombre: 'Clases y tutorías', icono: '📚', subs: ['Reforzamiento escolar', 'Idiomas', 'Música', 'Computación'] },
  { nombre: 'Eventos', icono: '🎉', subs: ['Catering', 'Fotografía y video', 'Animación', 'Alquiler de mobiliario'] },
  { nombre: 'Costura y confección', icono: '🧵', subs: ['Arreglos de ropa', 'Confección a medida', 'Bordados'] },
  { nombre: 'Mecánica', icono: '🔧', subs: ['Mecánica automotriz', 'Planchado y pintura', 'Electricidad automotriz'] },
  { nombre: 'Salud y bienestar', icono: '💚', subs: ['Masajes terapéuticos', 'Entrenamiento físico', 'Cuidado de adulto mayor'] },
]

// Paquetes de ejemplo (PDR §30: los valores NO son una regla permanente,
// el admin los edita desde /admin/paquetes).
const PAQUETES = [
  { nombre: 'Inicial', creditos: 5, precio: 10, orden: 1 },
  { nombre: 'Frecuente', creditos: 15, precio: 25, orden: 2 },
  { nombre: 'Profesional', creditos: 30, precio: 45, orden: 3 },
  { nombre: 'Intensivo', creditos: 60, precio: 80, orden: 4 },
]

async function main() {
  console.log('Sembrando ConectaIA…')

  // --- Configuración -------------------------------------------------------
  for (const [clave, valor] of Object.entries(CONFIG_DEFAULTS)) {
    await prisma.configuracion.upsert({ where: { clave }, update: {}, create: { clave, valor } })
  }
  console.log(`  · ${Object.keys(CONFIG_DEFAULTS).length} parámetros de configuración`)

  // --- Categorías ----------------------------------------------------------
  for (const [i, c] of CATALOGO.entries()) {
    const cat = await prisma.categoria.upsert({
      where: { nombre: c.nombre },
      update: { icono: c.icono, orden: i },
      create: { nombre: c.nombre, icono: c.icono, orden: i },
    })
    for (const sub of c.subs) {
      await prisma.subcategoria.upsert({
        where: { categoriaId_nombre: { categoriaId: cat.id, nombre: sub } },
        update: {},
        create: { categoriaId: cat.id, nombre: sub },
      })
    }
  }
  const totalSubs = CATALOGO.reduce((t, c) => t + c.subs.length, 0)
  console.log(`  · ${CATALOGO.length} categorías y ${totalSubs} subcategorías`)

  // --- Paquetes de créditos ------------------------------------------------
  for (const p of PAQUETES) {
    const existe = await prisma.paqueteCredito.findFirst({ where: { nombre: p.nombre } })
    if (!existe) await prisma.paqueteCredito.create({ data: p })
  }
  console.log(`  · ${PAQUETES.length} paquetes de créditos`)

  // --- Administrador -------------------------------------------------------
  const clave = await bcrypt.hash('admin123', 10)
  await prisma.usuario.upsert({
    where: { email: 'admin@conectaia.com' },
    update: { rol: 'admin' },
    create: {
      rol: 'admin',
      email: 'admin@conectaia.com',
      password: clave,
      nombres: 'Administrador',
      apellidos: 'ConectaIA',
      ciudad: 'Cajamarca',
      estado: 'activo',
    },
  })
  console.log('  · admin@conectaia.com / admin123')

  // --- Dos usuarios de demostración ---------------------------------------
  // Son los del ejemplo completo del PDR §45: María publica la necesidad de
  // pintura y Carlos ofrece el servicio, de modo que el matching tiene algo
  // que encontrar en cuanto se levanta la app.
  const demoClave = await bcrypt.hash('demo123', 10)

  // `update` devuelve el saldo a su valor de demostración: así, tras un
  // `scripts/reiniciar.ts`, las cuentas de prueba vuelven exactamente al estado
  // inicial y el flujo automatizado mide siempre lo mismo.
  const maria = await prisma.usuario.upsert({
    where: { email: 'maria@conectaia.com' },
    // El DNI también se repone: desde que el registro lo pide, una cuenta de
    // demostración sin DNI no se parece a las que crea la gente.
    update: { creditos: 3, modo: 'busco', dni: '40111222' },
    create: {
      email: 'maria@conectaia.com',
      password: demoClave,
      nombres: 'María',
      apellidos: 'Quispe',
      dni: '40111222',
      celular: '987111222',
      whatsapp: '987111222',
      ciudad: 'Cajamarca',
      distrito: 'Baños del Inca',
      direccion: 'Jr. Los Sauces 145',
      // Solo busca servicios: es quien publica la necesidad del PDR §45.
      modo: 'busco',
      descripcion: 'Vivo en Cajamarca y suelo necesitar apoyo para arreglos en casa.',
      creditos: 3,
      estado: 'activo',
    },
  })

  const carlos = await prisma.usuario.upsert({
    where: { email: 'carlos@conectaia.com' },
    update: { creditos: 3, modo: 'ofrezco', dni: '40333444' },
    create: {
      email: 'carlos@conectaia.com',
      password: demoClave,
      nombres: 'Carlos',
      apellidos: 'Pérez',
      dni: '40333444',
      celular: '987333444',
      whatsapp: '987333444',
      ciudad: 'Cajamarca',
      distrito: 'Cajamarca',
      direccion: 'Av. Perú 890',
      // Solo ofrece servicios: es el pintor del PDR §45.
      modo: 'ofrezco',
      descripcion: 'Pintor con 8 años de experiencia en interiores y exteriores.',
      creditos: 3,
      estado: 'activo',
    },
  })
  console.log('  · maria@conectaia.com y carlos@conectaia.com / demo123')

  // --- Publicaciones de ejemplo -------------------------------------------
  const pintura = await prisma.categoria.findUnique({ where: { nombre: 'Pintura' } })
  const interiores = await prisma.subcategoria.findFirst({
    where: { categoriaId: pintura!.id, nombre: 'Pintura de interiores' },
  })

  const tituloN = 'Pintar habitación'
  const descN =
    'Pintar habitación de aproximadamente 10 m². No incluye techo. Mismo color. Se requiere lijado y resanado en algunas partes.'

  const yaHay = await prisma.necesidad.findFirst({ where: { usuarioId: maria.id, titulo: tituloN } })
  if (!yaHay) {
    await prisma.necesidad.create({
      data: {
        usuarioId: maria.id,
        titulo: tituloN,
        categoriaId: pintura!.id,
        subcategoriaId: interiores!.id,
        descripcion: descN,
        precioOfrecido: 100,
        ciudad: 'Cajamarca',
        distrito: 'Baños del Inca',
        horario: 'Mañanas',
        estado: 'publicada',
        publicadaAt: new Date(),
        claves: construirClaves(tituloN, descN, 'Pintura', 'Pintura de interiores'),
      },
    })
  }

  const nombreS = 'Pintura de interiores'
  const descS =
    'Realizo pintura de habitaciones, salas y oficinas. Experiencia en lijado, resanado y acabados finos.'

  const yaHayS = await prisma.servicio.findFirst({ where: { usuarioId: carlos.id, nombre: nombreS } })
  if (!yaHayS) {
    await prisma.servicio.create({
      data: {
        usuarioId: carlos.id,
        nombre: nombreS,
        categoriaId: pintura!.id,
        subcategoriaId: interiores!.id,
        descripcion: descS,
        experiencia: '8 años',
        ciudad: 'Cajamarca',
        zona: 'Cajamarca y alrededores',
        precioDesde: 80,
        disponibilidad: 'Lunes a sábado',
        estado: 'publicado',
        publicadoAt: new Date(),
        claves: construirClaves(nombreS, descS, 'Pintura', 'Pintura de interiores', '8 años'),
      },
    })
  }
  console.log('  · necesidad y servicio de ejemplo (el caso del PDR §45)')

  console.log('Listo.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
