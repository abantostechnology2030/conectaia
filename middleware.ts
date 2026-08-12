import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'
import { NextResponse } from 'next/server'
import { INICIO, RUTAS_ROL } from '@/lib/roles'

// Rutas que se ven sin haber iniciado sesión: la portada, el login, el
// registro, el buscador público y las fichas públicas de perfiles y
// publicaciones (el escaparate del marketplace tiene que ser visible para que
// alguien se anime a registrarse).
const PUBLICAS = ['/login', '/registro']
const PREFIJOS_PUBLICOS = ['/buscar', '/p/', '/u/']

export default NextAuth(authConfig).auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth
  const role = req.auth?.user?.role ?? ''

  if (PUBLICAS.includes(pathname)) {
    if (isLoggedIn) return NextResponse.redirect(new URL(INICIO[role] ?? '/login', req.url))
    return NextResponse.next()
  }

  if (pathname === '/' || PREFIJOS_PUBLICOS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (!isLoggedIn) return NextResponse.redirect(new URL('/login', req.url))

  const inicio = INICIO[role] ?? '/login'

  // /perfil es común a todos los roles.
  if (pathname.startsWith('/perfil')) return NextResponse.next()

  const propias = RUTAS_ROL[role] ?? []
  const esZonaDeRol = Object.values(RUTAS_ROL).flat().some((p) => pathname.startsWith(p))
  if (esZonaDeRol && !propias.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL(inicio, req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
