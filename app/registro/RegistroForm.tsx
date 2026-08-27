'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import type { Modo } from '@/lib/lados'
import { DNI_DIGITOS } from '@/lib/dni'
import { RUC_DIGITOS } from '@/lib/ruc'

type TipoCuenta = 'natural' | 'empresa'

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
  const [tipoCuenta, setTipoCuenta] = useState<TipoCuenta>('natural')
  const esEmpresa = tipoCuenta === 'empresa'
  const [esMenorEdad, setEsMenorEdad] = useState(false)
  const [esPersonaConDiscapacidad, setEsPersonaConDiscapacidad] = useState(false)

  // Cualquiera de los dos casos exige los mismos datos del tutor: no hace
  // falta duplicar el bloque de campos ni la validación por caso. Una empresa
  // no puede ser menor de edad ni tener una discapacidad, así que el bloque
  // ni siquiera se ofrece en ese caso.
  const necesitaTutor = !esEmpresa && (esMenorEdad || esPersonaConDiscapacidad)

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setEnviando(true)

    const datos = new FormData(e.currentTarget)
    const cuerpo = Object.fromEntries(datos.entries()) as Record<string, string>
    cuerpo.tipoCuenta = tipoCuenta
    cuerpo.esMenorEdad = String(esMenorEdad)
    cuerpo.esPersonaConDiscapacidad = String(esPersonaConDiscapacidad)
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
      {/*
        Todos los campos son obligatorios, así que se dice una vez arriba en vez
        de poner un asterisco en cada uno: siete asteriscos seguidos no informan
        de nada y ensucian el formulario.
      */}
      <p className="text-sm text-slate-500">Todos los datos son obligatorios.</p>

      {/*
        El tipo de cuenta decide qué bloque de identidad se pide más abajo:
        persona (nombres, apellidos, DNI) o empresa (razón social, RUC,
        representante legal, dirección). Correo, celular, ciudad y contraseña
        son los mismos para las dos.
      */}
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setTipoCuenta('natural')}
          className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
            !esEmpresa ? 'bg-marino-600 text-white shadow-sm' : 'bg-marino-50 text-marino-700'
          }`}
        >
          Persona natural
        </button>
        <button
          type="button"
          onClick={() => setTipoCuenta('empresa')}
          className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
            esEmpresa ? 'bg-verde-600 text-white shadow-sm' : 'bg-verde-50 text-verde-700'
          }`}
        >
          Empresa
        </button>
      </div>

      {!esEmpresa && (
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
      )}

      {esEmpresa && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="etiqueta" htmlFor="razonSocial">
              Razón social
            </label>
            <input
              id="razonSocial"
              name="razonSocial"
              required
              className="campo"
              placeholder="Constructora ABC S.A.C."
            />
          </div>
          <div>
            <label className="etiqueta" htmlFor="representanteLegal">
              Representante legal
            </label>
            <input
              id="representanteLegal"
              name="representanteLegal"
              required
              className="campo"
              placeholder="Juan Pérez"
            />
          </div>
        </div>
      )}

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

      {!esEmpresa && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="etiqueta" htmlFor="dni">
              DNI
            </label>
            <input
              id="dni"
              name="dni"
              required
              inputMode="numeric"
              maxLength={DNI_DIGITOS}
              className="campo"
              placeholder="12345678"
            />
            <p className="ayuda">Nadie lo ve. Sirve para que cada persona tenga una sola cuenta.</p>
          </div>
          <div>
            <label className="etiqueta" htmlFor="celular">
              Celular
            </label>
            <input
              id="celular"
              name="celular"
              required
              inputMode="numeric"
              className="campo"
              placeholder="987654321"
            />
            <p className="ayuda">Nadie lo ve hasta que decidas conectar con alguien.</p>
          </div>
        </div>
      )}

      {esEmpresa && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="etiqueta" htmlFor="ruc">
              RUC
            </label>
            <input
              id="ruc"
              name="ruc"
              required
              inputMode="numeric"
              maxLength={RUC_DIGITOS}
              className="campo"
              placeholder="20123456789"
            />
            <p className="ayuda">Sirve para que cada empresa tenga una sola cuenta.</p>
          </div>
          <div>
            <label className="etiqueta" htmlFor="celular">
              Celular
            </label>
            <input
              id="celular"
              name="celular"
              required
              inputMode="numeric"
              className="campo"
              placeholder="987654321"
            />
            <p className="ayuda">Nadie lo ve hasta que decidas conectar con alguien.</p>
          </div>
        </div>
      )}

      {esEmpresa && (
        <div>
          <label className="etiqueta" htmlFor="direccion">
            Dirección
          </label>
          <input
            id="direccion"
            name="direccion"
            required
            className="campo"
            placeholder="Av. Ejemplo 123, oficina 4"
          />
          <p className="ayuda">Nadie la ve hasta que decidas conectar con alguien.</p>
        </div>
      )}

      <div>
        <label className="etiqueta" htmlFor="ciudad">
          Ciudad
        </label>
        <input id="ciudad" name="ciudad" required className="campo" placeholder="Cajamarca" />
        <p className="ayuda">Se usa para encontrarte trabajos cerca.</p>
      </div>

      {!esEmpresa && (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <label className="flex items-start gap-2.5 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={esMenorEdad}
              onChange={(e) => setEsMenorEdad(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-marca-600 focus:ring-marca-500"
            />
            Soy menor de edad
          </label>
          {esMenorEdad && (
            <p className="ayuda">
              Se requiere la autorización de tu padre, madre o tutor legal para continuar.
            </p>
          )}

          <label className="flex items-start gap-2.5 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={esPersonaConDiscapacidad}
              onChange={(e) => setEsPersonaConDiscapacidad(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-marca-600 focus:ring-marca-500"
            />
            Soy una persona con discapacidad
          </label>
          {esPersonaConDiscapacidad && (
            <p className="ayuda">
              Por seguridad, solicitamos los datos básicos de tu tutor ahora. Podrás completar la
              información detallada y documentos adicionales desde tu Perfil una vez registrado.
            </p>
          )}
        </div>
      )}

      {necesitaTutor && (
        <div className="space-y-4 rounded-xl border border-marca-200 bg-marca-50 p-4">
          <p className="text-sm font-bold text-slate-700">Datos de tu tutor</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="etiqueta" htmlFor="tutorNombres">
                Nombres del tutor
              </label>
              <input
                id="tutorNombres"
                name="tutorNombres"
                required
                className="campo"
                placeholder="Rosa"
              />
            </div>
            <div>
              <label className="etiqueta" htmlFor="tutorApellidos">
                Apellidos del tutor
              </label>
              <input
                id="tutorApellidos"
                name="tutorApellidos"
                required
                className="campo"
                placeholder="Quispe"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="etiqueta" htmlFor="tutorDni">
                DNI del tutor
              </label>
              <input
                id="tutorDni"
                name="tutorDni"
                required
                inputMode="numeric"
                maxLength={DNI_DIGITOS}
                className="campo"
                placeholder="12345678"
              />
            </div>
            <div>
              <label className="etiqueta" htmlFor="tutorCelular">
                Celular del tutor
              </label>
              <input
                id="tutorCelular"
                name="tutorCelular"
                required
                inputMode="numeric"
                className="campo"
                placeholder="987654321"
              />
            </div>
          </div>

          <div>
            <label className="etiqueta" htmlFor="tutorEmail">
              Correo del tutor
            </label>
            <input
              id="tutorEmail"
              name="tutorEmail"
              type="email"
              required
              className="campo"
              placeholder="tutor@ejemplo.com"
            />
          </div>

          <div>
            <label className="etiqueta" htmlFor="tutorParentesco">
              Parentesco con el tutor
            </label>
            <input
              id="tutorParentesco"
              name="tutorParentesco"
              required
              className="campo"
              placeholder="Madre, padre, tutor legal…"
            />
            <p className="ayuda">Nadie más lo ve. Solo sirve para poder verificarlo si hace falta.</p>
          </div>
        </div>
      )}

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
