import { auth } from '@/auth'

export class NoAutorizado extends Error {
  constructor(public status = 403) {
    super('No autorizado')
  }
}

export type Ctx = { id: number; rol: string; nombre: string }

// El segundo argumento que Next pasa a un handler de ruta: `{ params }` con los
// segmentos dinámicos, ya como promesa (Next 15+). Las rutas sin segmentos
// dinámicos lo reciben igual y simplemente no lo usan.
export type Extra = { params: Promise<Record<string, string>> }

// Devuelve la sesión si el rol coincide; si no, lanza NoAutorizado.
export async function exigirRol(...roles: string[]): Promise<Ctx> {
  const session = await auth()
  if (!session?.user) throw new NoAutorizado(401)
  if (roles.length && !roles.includes(session.user.role)) throw new NoAutorizado(403)
  return { id: Number(session.user.id), rol: session.user.role, nombre: session.user.name ?? '' }
}

// Envuelve un handler de API y traduce NoAutorizado a una respuesta JSON.
export function conRol<E = Extra>(
  roles: string[],
  handler: (ctx: Ctx, req: Request, extra: E) => Promise<Response>,
) {
  return async (req: Request, extra: E) => {
    try {
      const ctx = await exigirRol(...roles)
      return await handler(ctx, req, extra)
    } catch (e) {
      if (e instanceof NoAutorizado) return Response.json({ error: 'No autorizado' }, { status: e.status })

      // ⚠️ El mensaje del error NO se devuelve al navegador. Antes sí, y un
      // choque de dos pulsaciones a la vez llegó a enseñarle al usuario
      // "Unique constraint failed on the fields: (`postulacionId`)" — un texto
      // que no le dice nada y que además cuenta cómo está hecha la base por
      // dentro. Los errores previstos ya devuelven su propia respuesta con un
      // mensaje escrito para personas; lo que llega hasta aquí es un fallo
      // nuestro, y al usuario solo le sirve saber que fue nuestro.
      console.error('[API]', e)
      return Response.json(
        { error: 'Algo falló de nuestro lado. Vuelve a intentarlo en un momento.' },
        { status: 500 },
      )
    }
  }
}

// Atajo: cualquier cuenta que haya iniciado sesión (usuario o admin).
export const conSesion = <E = Extra>(
  handler: (ctx: Ctx, req: Request, extra: E) => Promise<Response>,
) => conRol<E>(['usuario', 'admin'], handler)
