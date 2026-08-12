import { redirect } from 'next/navigation'
import { auth, signOut } from '@/auth'
import { prisma } from '@/lib/db'
import Sidebar from '@/components/Sidebar'
import { PieDePagina } from '@/components/PieDePagina'
import { menuAdmin, menuUsuario } from '@/lib/menu'
import { modoEfectivo } from '@/lib/modos'
import { ETIQUETA_ROL } from '@/lib/roles'

// La acción vive en el módulo, no dentro de una rama del componente: las
// acciones de servidor tienen que poder resolverse en la compilación.
async function cerrarSesion() {
  'use server'
  await signOut({ redirectTo: '/login' })
}

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const rol = session.user.role

  const yo = await prisma.usuario.findUnique({
    where: { id: Number(session.user.id) },
    select: { fotoUrl: true, creditos: true, estado: true, modo: true },
  })

  // La cuenta pudo suspenderse con la sesión ya abierta: el JWT sigue siendo
  // válido durante días, así que hay que comprobarlo aquí y no solo al entrar.
  if (!yo || yo.estado === 'suspendido') {
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div className="tarjeta max-w-md text-center">
          <span className="text-4xl">🚫</span>
          <h1 className="mt-3 text-xl font-extrabold text-slate-800">Cuenta suspendida</h1>
          <p className="mt-2 text-sm text-slate-600">
            Tu cuenta está suspendida y no puede usar la plataforma. Si crees que es un error,
            comunícate con el administrador.
          </p>
          <form action={cerrarSesion} className="mt-4">
            <button type="submit" className="btn-primario w-full">
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Aquí ya no se pregunta nada: el lado se elige al crear la cuenta. Las
  // cuentas anteriores a ese cambio pueden tener el modo vacío, y `modoEfectivo`
  // las deja ver la aplicación entera en vez de media.
  const sinLeer = await prisma.notificacion.count({
    where: { usuarioId: Number(session.user.id), leida: false },
  })

  // Lo que el administrador tiene en cola. Solo se consulta si es admin: al
  // usuario normal estas tres cuentas no le dicen nada y serían tres consultas
  // en cada carga de cada página del panel.
  const pendientes =
    rol === 'admin'
      ? await (async () => {
          const [necesidades, servicios, recargas] = await Promise.all([
            prisma.necesidad.count({ where: { estado: 'en_revision' } }),
            prisma.servicio.count({ where: { estado: 'en_revision' } }),
            prisma.recarga.count({ where: { estado: 'pendiente' } }),
          ])
          return { necesidades, servicios, recargas }
        })()
      : undefined

  return (
    // Columna a pantalla completa para que el pie quede siempre abajo del todo.
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 lg:flex">
        <Sidebar
          enlaces={rol === 'admin' ? menuAdmin(pendientes) : menuUsuario(modoEfectivo(yo.modo))}
          nombre={session.user.name ?? ''}
          rol={ETIQUETA_ROL[rol] ?? rol}
          foto={yo.fotoUrl}
          creditos={rol === 'admin' ? null : yo.creditos}
          sinLeer={sinLeer}
          onSignOut={cerrarSesion}
        />
        <main className="min-w-0 flex-1 px-4 py-6 pb-16 sm:px-6 lg:px-8">{children}</main>
      </div>

      <PieDePagina />
    </div>
  )
}
