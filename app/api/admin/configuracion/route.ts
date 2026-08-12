import { prisma } from '@/lib/db'
import { conRol } from '@/lib/guard'
import { CONFIG_DEFAULTS, setValor } from '@/lib/config'
import { guardarImagen, borrarImagen } from '@/lib/uploads'

// Guarda los parámetros del sistema. Solo se aceptan claves conocidas: sin ese
// filtro, cualquier campo de más en el formulario acabaría creando filas
// basura en la tabla de configuración.
export const PATCH = conRol(['admin'], async (_ctx, req) => {
  const tipo = req.headers.get('content-type') ?? ''

  // El QR de Yape llega como archivo y tiene su propio camino.
  if (tipo.includes('multipart/form-data')) {
    const form = await req.formData()
    const qr = form.get('yape_qr')
    if (!(qr instanceof File) || qr.size === 0) {
      return Response.json({ error: 'Adjunta la imagen del QR' }, { status: 400 })
    }

    const antes = await prisma.configuracion.findUnique({ where: { clave: 'yape_qr' } })
    let url: string
    try {
      url = await guardarImagen(qr, 'config', 'yape-qr')
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 400 })
    }
    await setValor('yape_qr', url)
    await borrarImagen(antes?.valor)

    return Response.json({ ok: true, url })
  }

  const b = await req.json().catch(() => ({}))
  const conocidas = Object.keys(CONFIG_DEFAULTS)
  let guardadas = 0

  for (const [clave, valor] of Object.entries(b)) {
    if (!conocidas.includes(clave)) continue
    await setValor(clave, String(valor))
    guardadas++
  }

  return Response.json({ ok: true, guardadas })
})
