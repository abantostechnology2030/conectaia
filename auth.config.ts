import type { NextAuthConfig, Session, User } from 'next-auth'
import type { JWT } from 'next-auth/jwt'

export const authConfig = {
  // Imprescindible aquí, no solo en auth.ts: el middleware corre en el runtime
  // Edge con esta configuración y, detrás de Nginx, sin esto rechaza el host
  // reenviado por el proxy (UntrustedHost) y deja a todos fuera de la app.
  trustHost: true,
  session: { strategy: 'jwt' as const },
  pages: { signIn: '/login' },
  providers: [],
  callbacks: {
    jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    session({ session, token }: { session: Session; token: JWT }) {
      session.user.id = String(token.id ?? '')
      session.user.role = String(token.role ?? '')
      return session
    },
  },
} satisfies NextAuthConfig
