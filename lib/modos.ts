// Guardas de servidor para los dos lados del marketplace.
//
// El PDR §4 dice que una misma cuenta puede pedir y ofrecer, y eso NO cambia:
// sigue habiendo un solo tipo de usuario y nadie necesita una segunda cuenta.
// Lo que hace el modo es decidir QUÉ SE LE ENSEÑA. A quien solo quiere que le
// pinten una habitación, media aplicación le sobra.
//
// **El lado se elige en la portada, antes de entrar.** Las dos puertas
// ("Busco un servicio" / "Ofrezco un servicio") llevan al mismo login llevando consigo el
// lado elegido; al entrar se guarda y se abre ese panel. El login y el registro
// no preguntan nada al respecto: son generales.
//
// Dentro, el panel tiene SIEMPRE los dos botones abajo para pasar de un lado al
// otro. Cambiar de lado no toca nada de lo publicado.
//
// ⚠️ **Este archivo importa Prisma: NUNCA lo importe un componente de cliente.**
// Lo que necesitan los botones del panel y el selector del perfil —`MODOS`,
// `ETIQUETA_MODO`, `modoEfectivo`, `otroLado`…— vive en `lib/lados.ts`, que no
// toca el servidor. Cuando estaba todo junto, el bundler se llevaba Prisma al
// navegador y esos componentes no llegaban a hidratarse: los botones se veían
// bien y no hacían nada al pulsarlos, sin un solo error al compilar.

import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from './db'
import { puedeBuscar, puedeOfrecer } from './lados'

// Se reexporta para que el servidor pueda seguir importando de '@/lib/modos'.
export {
  MODOS,
  esModo,
  ETIQUETA_MODO,
  modoEfectivo,
  puedeBuscar,
  puedeOfrecer,
  otroLado,
  rutaPermitida,
} from './lados'
export type { Modo } from './lados'

export type Yo = { id: number; modo: string | null; nombre: string }

/** La sesión más el modo, leído de la base (el JWT no lo lleva). */
export async function usuarioActual(): Promise<Yo> {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const u = await prisma.usuario.findUnique({
    where: { id: Number(session.user.id) },
    select: { id: true, modo: true },
  })
  if (!u) redirect('/login')

  return { id: u.id, modo: u.modo, nombre: session.user.name ?? '' }
}

/**
 * Guarda para las páginas de un lado concreto. Si el usuario está en el otro,
 * se le lleva a cambiarse en vez de enseñarle un 404: la página existe, lo que
 * pasa es que ahora mismo está mirando el otro lado.
 *
 * Se devuelve al PANEL porque es donde están los dos botones para cambiar, así
 * que quien escribe la dirección a mano acaba justo delante de lo que le
 * faltaba.
 */
export async function exigirLado(lado: 'busco' | 'ofrezco'): Promise<Yo> {
  const yo = await usuarioActual()

  const permitido = lado === 'busco' ? puedeBuscar(yo.modo) : puedeOfrecer(yo.modo)
  if (!permitido) redirect(`/panel?activar=${lado}`)

  return yo
}

/**
 * La misma comprobación para las rutas de API.
 *
 * Hace falta aparte porque una API no puede redirigir a una pantalla: devuelve
 * una respuesta o `null` si todo está en orden. Y hace falta a secas porque sin
 * ella la restricción sería puro maquillaje — quien llamara a `POST
 * /api/servicios` desde la consola publicaría igual desde el otro lado.
 */
export async function vetoPorModo(
  usuarioId: number,
  lado: 'busco' | 'ofrezco',
): Promise<Response | null> {
  const u = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { modo: true },
  })

  // Sin usuario no se concede nada. Se comprueba aparte porque `modoEfectivo`
  // lee un modo ausente como `busco`, y esa cortesía es para las cuentas viejas
  // que nunca eligieron — no para una cuenta que no existe.
  if (!u) {
    return Response.json({ error: 'Cuenta no encontrada', motivo: 'modo' }, { status: 403 })
  }

  const permitido = lado === 'busco' ? puedeBuscar(u.modo) : puedeOfrecer(u.modo)
  if (permitido) return null

  return Response.json(
    {
      error:
        lado === 'ofrezco'
          ? 'Para publicar servicios y postularte tienes que pasarte a «Ofrezco un servicio»'
          : 'Para publicar necesidades y recibir ofertas tienes que pasarte a «Busco un servicio»',
      motivo: 'modo',
      activar: lado,
    },
    { status: 403 },
  )
}
