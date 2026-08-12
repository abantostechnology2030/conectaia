'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'

/**
 * Login general: el mismo para quien necesita y para quien ofrece.
 *
 * No pregunta el lado — eso se eligió en la portada y llega en `lado`. Lo que
 * hace es guardarlo nada más entrar, para que el panel que se abra sea el que
 * el usuario pidió antes de escribir su contraseña.
 */
export default function LoginForm({
  destino = '/panel',
  lado,
}: {
  destino?: string
  lado?: 'busco' | 'ofrezco'
}) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setEnviando(true)

    const datos = new FormData(e.currentTarget)
    const r = await signIn('credentials', {
      email: String(datos.get('email') ?? ''),
      password: String(datos.get('password') ?? ''),
      redirect: false,
    })

    setEnviando(false)

    if (r?.error) {
      // NextAuth v5 envuelve el Error que lanza `authorize` en un
      // CredentialsSignin genérico, así que no llega el motivo original. Se
      // distingue el caso de la cuenta suspendida por el `code` cuando viene.
      setError(
        String(r.code ?? '').includes('suspendido')
          ? 'Tu cuenta está suspendida. Comunícate con el administrador.'
          : 'Correo o contraseña incorrectos.',
      )
      return
    }

    // Se guarda el lado que eligió en la portada ANTES de navegar: si no, el
    // panel se pintaría con el lado de la última vez y la puerta que acaba de
    // pulsar no habría servido de nada.
    //
    // Que falle no puede dejarlo fuera: entra igual, con el lado que ya tuviera,
    // y los dos botones del panel siguen ahí para cambiarlo. Al administrador la
    // llamada le devuelve 403 y es correcto — no participa en el marketplace.
    if (lado) {
      await fetch('/api/perfil/modo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modo: lado }),
      }).catch(() => {})
    }

    // Al panel, salvo que el enlace trajera un destino interno válido. No hay
    // ninguna pantalla intermedia ni ninguna pregunta. Si es un administrador,
    // el middleware lo llevará a su propio panel.
    router.push(destino)
    router.refresh()
  }

  return (
    <form onSubmit={enviar} className="mt-5 space-y-4">
      <div>
        <label className="etiqueta" htmlFor="email">
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="campo"
          placeholder="tucorreo@ejemplo.com"
        />
      </div>

      <div>
        <label className="etiqueta" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="campo"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}

      <button type="submit" disabled={enviando} className="btn-primario w-full">
        {enviando ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}
