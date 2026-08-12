import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { authConfig } from './auth.config'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // Detrás de Nginx: confía en el Host reenviado por el proxy.
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Correo', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const email = String(credentials.email).trim().toLowerCase()
        const password = String(credentials.password)

        const user = await prisma.usuario.findUnique({ where: { email } })
        if (!user) return null
        // Se lanza en vez de devolver null para que el login pueda decir POR QUÉ
        // no entra: "suspendida" y "contraseña incorrecta" son problemas
        // distintos y el usuario no puede resolverlos igual.
        if (user.estado === 'suspendido') throw new Error('suspendido')
        if (!(await bcrypt.compare(password, user.password))) return null

        return {
          id: String(user.id),
          email: user.email,
          role: user.rol,
          name: `${user.nombres} ${user.apellidos}`.trim(),
        }
      },
    }),
  ],
})
