import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LogoCompleto } from '@/components/Logo'
import { PieDePagina } from '@/components/PieDePagina'
import { getConfig, esSi } from '@/lib/config'
import { ladoSeguro } from '@/lib/destino'
import RegistroForm from './RegistroForm'

export const dynamic = 'force-dynamic'

// El registro NO pregunta si el usuario necesita u ofrece servicios, ni nada al
// respecto: es un alta general, igual para los dos lados. La elección se hizo en
// la portada y llega hasta aquí en `?lado=`, de fondo, por el enlace "Crear
// cuenta" del login.
//
// Si alguien llega al registro sin pasar por una puerta, la cuenta se queda con
// el lado que ponga `modoEfectivo()`. No es una decisión que atrape a nadie: los
// dos botones del panel están siempre a la vista.
export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ lado?: string }>
}) {
  const cfg = await getConfig()
  if (!esSi(cfg.registro_abierto)) redirect('/login')

  const { lado } = await searchParams
  const elLado = ladoSeguro(lado)
  const regalo = Number(cfg.creditos_bienvenida) || 0

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="grid flex-1 place-items-center px-4 py-10">
        <div className="w-full max-w-lg">
        <div className="mb-6">
          <LogoCompleto alto={130} href="/" />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-extrabold text-slate-800">Crear tu cuenta</h1>
          <p className="mt-1 text-sm text-slate-500">
            Con una sola cuenta puedes publicar lo que necesitas y también lo que sabes hacer.
          </p>

          <RegistroForm lado={elLado} />

          {regalo > 0 && (
            <p className="mt-4 rounded-xl border border-marca-200 bg-marca-50 px-4 py-2.5 text-center text-sm font-semibold text-marca-800">
              🎁 Te regalamos {regalo} crédito{regalo === 1 ? '' : 's'} de bienvenida.
            </p>
          )}
        </div>

          <p className="mt-5 text-center text-sm text-slate-600">
            ¿Ya tienes cuenta?{' '}
            <Link
              href={elLado ? `/login?lado=${elLado}` : '/login'}
              className="font-bold text-marca-600 hover:underline"
            >
              Entrar
            </Link>
          </p>
        </div>
      </div>

      <PieDePagina />
    </div>
  )
}
