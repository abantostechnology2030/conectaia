import { mkdir, unlink, writeFile } from 'fs/promises'
import path from 'path'

const TIPOS = ['image/jpeg', 'image/png', 'image/webp']
const MAX = 5 * 1024 * 1024 // 5 MB

// Guarda una imagen en public/uploads/<carpeta>/ y devuelve su ruta pública.
export async function guardarImagen(file: File, carpeta: string, nombreBase: string): Promise<string> {
  if (!TIPOS.includes(file.type)) throw new Error('Formato no permitido (usa JPG, PNG o WEBP)')
  if (file.size > MAX) throw new Error('La imagen supera los 5 MB')

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  // El sufijo aleatorio evita que dos fotos subidas en el mismo milisegundo
  // (el navegador manda todas juntas) se pisen entre sí.
  const nombre = `${nombreBase}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
  const dir = path.join(process.cwd(), 'public', 'uploads', carpeta)

  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, nombre), Buffer.from(await file.arrayBuffer()))

  return `/uploads/${carpeta}/${nombre}`
}

// Borra una imagen subida antes. Solo toca rutas dentro de /uploads/ y nunca
// falla: si el archivo ya no está, no hay nada que hacer.
export async function borrarImagen(ruta: string | null | undefined): Promise<void> {
  if (!ruta || !ruta.startsWith('/uploads/') || ruta.includes('..')) return
  await unlink(path.join(process.cwd(), 'public', ruta.slice(1))).catch(() => {})
}
