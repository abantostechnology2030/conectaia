import type { Enlace } from '@/components/Sidebar'
import { puedeBuscar, puedeOfrecer } from './lados'

// Menú lateral por rol.
//
// El del usuario sigue el orden del PDR §34-37: primero el resumen, luego los
// dos lados del marketplace (lo que busco / lo que ofrezco), después lo que
// nace de ellos (oportunidades, postulaciones, trabajos) y al final la cuenta.
//
// Se arma según el `modo` del usuario: quien solo busca no ve "Ofrezco un
// servicio" ni "Mis postulaciones", y al revés. Los trabajos, los créditos y el
// perfil salen siempre: son los mismos se haya llegado por el lado que se haya
// llegado. Ocultar el enlace es solo la mitad del trabajo — las páginas de cada
// lado llaman además a `exigirLado()` (ver lib/modos.ts).
export function menuUsuario(modo: string | null | undefined): Enlace[] {
  const busco = puedeBuscar(modo)
  const ofrezco = puedeOfrecer(modo)

  return [
    { href: '/panel', label: 'Inicio', icono: 'panel', color: 'text-marca-500' },

    ...(busco
      ? [{ href: '/necesidades', label: 'Busco un servicio', icono: 'busco' as const, color: 'text-cielo-500' }]
      : []),
    ...(ofrezco
      ? [{ href: '/servicios', label: 'Ofrezco un servicio', icono: 'ofrezco' as const, color: 'text-menta-500' }]
      : []),

    // La misma pantalla, pero se llama distinto según desde qué lado se mire:
    // es la misma tabla `Match` leída al revés, y "Oportunidades" a secas no
    // decía a quién iba a encontrar uno ahí. Desde la oferta son trabajos
    // posibles; desde la demanda, personas que podrían hacerlo.
    {
      href: '/oportunidades',
      label: ofrezco ? 'Mis oportunidades de trabajo' : 'Posibles trabajadores',
      icono: 'match',
      color: 'text-durazno-500',
    },

    ...(ofrezco
      ? [{ href: '/postulaciones', label: 'Mis postulaciones', icono: 'oferta' as const, color: 'text-sol-500' }]
      : []),

    { href: '/trabajos', label: 'Mis trabajos', icono: 'trabajo', color: 'text-marca-400' },
    { href: '/creditos', label: 'Mis créditos', icono: 'creditos', color: 'text-cielo-500' },
    { href: '/perfil', label: 'Mi perfil', icono: 'perfil', color: 'text-slate-400' },
  ]
}

/** Lo que está esperando a que el administrador lo atienda. */
export type Pendientes = {
  necesidades: number
  servicios: number
  recargas: number
}

/**
 * Menú del administrador, con los contadores de lo que tiene en cola.
 *
 * Los badges no son decoración: sin ellos, una publicación en revisión y una
 * recarga pagada esperan indefinidamente a que a alguien se le ocurra entrar a
 * mirar. Son lo único que convierte "hay una cola" en "hay trabajo pendiente".
 *
 * Van en las tres entradas que tienen cola propia en vez de en una sola
 * pantalla de "aprobaciones": así se ve de un vistazo QUÉ hay que atender, y
 * cada número lleva justo a la lista donde se resuelve.
 */
export function menuAdmin(p?: Pendientes): Enlace[] {
  return [
  { href: '/admin', label: 'Panel', icono: 'panel', color: 'text-marca-500' },
  { href: '/admin/usuarios', label: 'Usuarios', icono: 'usuarios', color: 'text-cielo-500' },
  { href: '/admin/necesidades', label: 'Necesidades', icono: 'busco', color: 'text-durazno-500', pendientes: p?.necesidades },
  { href: '/admin/servicios', label: 'Servicios', icono: 'ofrezco', color: 'text-menta-500', pendientes: p?.servicios },
  { href: '/admin/postulaciones', label: 'Postulaciones', icono: 'oferta', color: 'text-sol-500' },
  { href: '/admin/matching', label: 'Matching', icono: 'match', color: 'text-marca-400' },
  { href: '/admin/recargas', label: 'Recargas', icono: 'creditos', color: 'text-cielo-500', pendientes: p?.recargas },
  { href: '/admin/movimientos', label: 'Movimientos', icono: 'movimiento', color: 'text-durazno-500' },
  { href: '/admin/calificaciones', label: 'Calificaciones', icono: 'estrella', color: 'text-sol-500' },
  { href: '/admin/moderacion', label: 'Moderación', icono: 'alerta', color: 'text-rose-400' },
    // "Categorías" y "Paquetes" NO están en el menú: se entra a ellas desde
    // Configuración. Son ajustes del catálogo que se tocan de vez en cuando, y
    // tenerlas aquí arriba, al lado de las colas que sí piden atención a
    // diario, alargaba el menú sin que ninguna de las dos lo mereciera.
    { href: '/admin/configuracion', label: 'Configuración', icono: 'config', color: 'text-slate-400' },
    { href: '/perfil', label: 'Mi perfil', icono: 'perfil', color: 'text-marca-400' },
  ]
}
