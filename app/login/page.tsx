import Link from 'next/link'
import { LogoCompleto } from '@/components/Logo'
import { PieDePagina } from '@/components/PieDePagina'
import { destinoSeguro, ladoSeguro } from '@/lib/destino'
import { ETIQUETA_MODO } from '@/lib/lados'
import LoginForm from './LoginForm'

// UN SOLO login para las dos puertas de la portada. No pregunta si el usuario
// necesita u ofrece: eso ya lo eligió allí y llega en `?lado=`. Aquí solo se
// entra —o se crea la cuenta— y el lado viaja de fondo hasta el panel.
//
// El `?lado=` se arrastra también al enlace de crear cuenta: si se perdiera ahí,
// quien no tiene cuenta acabaría en el panel contrario al que pulsó.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; destino?: string; lado?: string }>
}) {
  const { error, destino, lado } = await searchParams
  const aDonde = destinoSeguro(destino)
  const elLado = ladoSeguro(lado)

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="grid flex-1 place-items-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6">
            <LogoCompleto alto={150} href="/" />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-extrabold text-slate-800">Entrar a tu cuenta</h1>
            <p className="mt-1 text-sm text-slate-500">
              Una sola cuenta para pedir y para ofrecer servicios.
            </p>

            {/* Solo recuerda por qué puerta entró. No es una pregunta ni se
                puede cambiar aquí: se cambia dentro, en el panel. */}
            {elLado && (
              <p
                className={`mt-4 rounded-xl border px-4 py-2.5 text-sm font-semibold ${
                  elLado === 'busco'
                    ? 'border-cielo-300 bg-cielo-50 text-cielo-700'
                    : 'border-menta-300 bg-menta-50 text-menta-700'
                }`}
              >
                {elLado === 'busco' ? '🔎' : '🛠️'} Entrarás a «{ETIQUETA_MODO[elLado]}». Dentro
                puedes cambiar al otro lado cuando quieras.
              </p>
            )}

            {error === 'suspendido' && (
              <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">
                Tu cuenta está suspendida. Comunícate con el administrador.
              </p>
            )}

            <LoginForm destino={aDonde} lado={elLado} />
          </div>

          <p className="mt-5 text-center text-sm text-slate-600">
            ¿Aún no tienes cuenta?{' '}
            <Link
              href={elLado ? `/registro?lado=${elLado}` : '/registro'}
              className="font-bold text-marca-600 hover:underline"
            >
              Crear cuenta gratis
            </Link>
          </p>
          <p className="mt-2 text-center text-sm">
            <Link href="/" className="text-slate-500 hover:underline">
              Volver al inicio
            </Link>
          </p>
        </div>
      </div>

      <PieDePagina />
    </div>
  )
}
