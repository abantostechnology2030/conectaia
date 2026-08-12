'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import type { Modo } from '@/lib/lados'

/**
 * Alta de cuenta.
 *
 * **No pregunta si el usuario necesita u ofrece servicios, ni nada al respecto.**
 * Eso se eligió en la portada y llega en `lado`, de fondo. Aquí solo se piden
 * los datos de la persona: meter la pregunta también aquí la pondría en dos
 * sitios y obligaría a contestarla dos veces.
 */
export default function RegistroForm({ lado }: { lado?: Modo }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setEnviando(true)

    const datos = new FormData(e.currentTarget)
    const cuerpo = Object.fromEntries(datos.entries()) as Record<string, string>
    if (lado) cuerpo.modo = lado

    const r = await fetch('/api/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    })
    const j = await r.json().catch(() => ({}))

    if (!r.ok) {
      setError(j.error ?? 'No se pudo crear la cuenta.')
      setEnviando(false)
      return
    }

    // Se entra directo: pedirle la contraseña otra vez justo después de
    // escribirla es la forma más rápida de perder a alguien que se registra.
    await signIn('credentials', {
      email: cuerpo.email ?? '',
      password: cuerpo.password ?? '',
      redirect: false,
    })

    // Al panel, que ya sale armado con el lado que eligió en la portada.
    router.push('/panel')
    router.refresh()
  }

  return (
    <form onSubmit={enviar} className="mt-5 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="etiqueta" htmlFor="nombres">
            Nombres
          </label>
          <input id="nombres" name="nombres" required className="campo" placeholder="María" />
        </div>
        <div>
          <label className="etiqueta" htmlFor="apellidos">
            Apellidos
          </label>
          <input id="apellidos" name="apellidos" required className="campo" placeholder="Quispe" />
        </div>
      </div>

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

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="etiqueta" htmlFor="celular">
            Celular
          </label>
          <input
            id="celular"
            name="celular"
            inputMode="numeric"
            className="campo"
            placeholder="987654321"
          />
          <p className="ayuda">Nadie lo ve hasta que decidas conectar con alguien.</p>
        </div>
        <div>
          <label className="etiqueta" htmlFor="ciudad">
            Ciudad
          </label>
          <input id="ciudad" name="ciudad" required className="campo" placeholder="Cajamarca" />
          <p className="ayuda">Se usa para encontrarte trabajos cerca.</p>
        </div>
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
          minLength={6}
          autoComplete="new-password"
          className="campo"
          placeholder="Mínimo 6 caracteres"
        />
      </div>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}

      <button type="submit" disabled={enviando} className="btn-primario w-full">
        {enviando ? 'Creando cuenta…' : 'Crear mi cuenta'}
      </button>
    </form>
  )
}
