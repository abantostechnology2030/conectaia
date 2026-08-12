import Link from 'next/link'
import { auth, signOut } from '@/auth'
import { LogoCompleto } from '@/components/Logo'
import { PieDePagina } from '@/components/PieDePagina'
import { INICIO } from '@/lib/roles'

// Marco de las páginas que se ven SIN iniciar sesión: buscador, fichas
// públicas y perfiles. El escaparate tiene que ser visible para que alguien
// se anime a registrarse, así que estas rutas no pasan por el panel.
async function cerrarSesion() {
  'use server'
  await signOut({ redirectTo: '/' })
}

export default async function PublicoLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const rol = session?.user?.role

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-marino-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          {/* Tres veces el tamaño anterior (58 px). Va por clases y no por
              `alto` para que en un móvil no se coma la pantalla, y SIN
              `compacto`: el archivo del menú (320 px de alto) se vería blando a
              174; a este tamaño toca el grande, que se genera a 560. */}
          <LogoCompleto clase="h-16 sm:h-28 lg:h-[174px]" href="/" />
          <div className="flex items-center gap-2">
            <Link href="/buscar" className="btn-secundario hidden sm:inline-flex">
              Explorar
            </Link>
            {session?.user ? (
              <>
                <Link href={INICIO[rol ?? 'usuario'] ?? '/panel'} className="btn-primario">
                  Mi panel
                </Link>
                <form action={cerrarSesion}>
                  <button type="submit" className="btn-secundario">
                    Salir
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-secundario">
                  Entrar
                </Link>
                <Link href="/registro" className="btn-primario">
                  Crear cuenta
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>

      <PieDePagina />
    </div>
  )
}
