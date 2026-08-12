// Rol -> página de inicio y etiquetas visibles. Usado por el middleware, el
// layout autenticado y las redirecciones tras el login.
//
// ConectaIA tiene UN SOLO tipo funcional de cuenta (PDR §4): la misma persona
// publica necesidades y servicios. El rol solo separa al administrador de la
// plataforma del resto.

export const ROLES = ['admin', 'usuario'] as const
export type Rol = (typeof ROLES)[number]

export const INICIO: Record<string, string> = {
  admin: '/admin',
  usuario: '/panel',
}

export const ETIQUETA_ROL: Record<string, string> = {
  admin: 'Administrador',
  usuario: 'Usuario',
}

// Prefijos de ruta que le pertenecen a cada rol.
export const RUTAS_ROL: Record<string, string[]> = {
  admin: ['/admin'],
  usuario: [
    '/panel',
    '/necesidades',
    '/servicios',
    '/oportunidades',
    '/postulaciones',
    '/trabajos',
    '/creditos',
    '/notificaciones',
  ],
}
