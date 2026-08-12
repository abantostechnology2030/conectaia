'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/Avatar'

type Datos = {
  nombres: string
  apellidos: string
  email: string
  dni: string | null
  celular: string | null
  whatsapp: string | null
  ciudad: string | null
  distrito: string | null
  direccion: string | null
  descripcion: string | null
  fotoUrl: string | null
}

export default function PerfilForm({ datos }: { datos: Datos }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [previa, setPrevia] = useState<string | null>(null)

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setOk(false)
    setOcupado(true)

    const r = await fetch('/api/perfil', { method: 'PATCH', body: new FormData(e.currentTarget) })
    const j = await r.json().catch(() => ({}))
    setOcupado(false)

    if (!r.ok) {
      setError(j.error ?? 'No se pudo guardar.')
      return
    }
    setOk(true)
    router.refresh()
  }

  const nombreCompleto = `${datos.nombres} ${datos.apellidos}`.trim()

  return (
    <form onSubmit={enviar} className="space-y-6">
      <div className="tarjeta space-y-4">
        <h2 className="font-bold text-slate-700">Datos públicos</h2>
        <p className="text-sm text-slate-500">
          Esto es lo que ve cualquiera que abra tu perfil.
        </p>

        <div className="flex items-center gap-4">
          <Avatar src={previa ?? datos.fotoUrl} nombre={nombreCompleto} tam={72} />
          <div>
            <label className="etiqueta" htmlFor="foto">
              Foto de perfil
            </label>
            <input
              id="foto"
              name="foto"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="campo"
              onChange={(e) => {
                const f = e.target.files?.[0]
                setPrevia(f ? URL.createObjectURL(f) : null)
              }}
            />
            <p className="ayuda">JPG, PNG o WEBP · hasta 5 MB.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="etiqueta" htmlFor="nombres">
              Nombres <span className="text-rose-500">*</span>
            </label>
            <input id="nombres" name="nombres" required defaultValue={datos.nombres} className="campo" />
          </div>
          <div>
            <label className="etiqueta" htmlFor="apellidos">
              Apellidos <span className="text-rose-500">*</span>
            </label>
            <input id="apellidos" name="apellidos" required defaultValue={datos.apellidos} className="campo" />
          </div>
        </div>

        <div>
          <label className="etiqueta" htmlFor="descripcion">
            Sobre ti
          </label>
          <textarea
            id="descripcion"
            name="descripcion"
            rows={3}
            defaultValue={datos.descripcion ?? ''}
            className="campo"
            placeholder="Cuéntale a los demás quién eres y a qué te dedicas."
          />
          <p className="ayuda">No escribas aquí tu teléfono ni tu correo: este texto es público.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="etiqueta" htmlFor="ciudad">
              Ciudad <span className="text-rose-500">*</span>
            </label>
            <input id="ciudad" name="ciudad" required defaultValue={datos.ciudad ?? ''} className="campo" />
          </div>
          <div>
            <label className="etiqueta" htmlFor="distrito">
              Distrito
            </label>
            <input id="distrito" name="distrito" defaultValue={datos.distrito ?? ''} className="campo" />
          </div>
        </div>
      </div>

      <div className="tarjeta space-y-4">
        <h2 className="font-bold text-slate-700">Datos privados</h2>
        <p className="rounded-xl border border-marca-200 bg-marca-50 px-4 py-2.5 text-sm text-marca-800">
          🔒 Nadie ve estos datos. Se comparten únicamente cuando alguien desbloquea el contacto
          contigo, o cuando lo desbloqueas tú.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="etiqueta" htmlFor="celular">
              Celular
            </label>
            <input
              id="celular"
              name="celular"
              inputMode="numeric"
              defaultValue={datos.celular ?? ''}
              className="campo"
              placeholder="987654321"
            />
          </div>
          <div>
            <label className="etiqueta" htmlFor="whatsapp">
              WhatsApp
            </label>
            <input
              id="whatsapp"
              name="whatsapp"
              inputMode="numeric"
              defaultValue={datos.whatsapp ?? ''}
              className="campo"
              placeholder="987654321"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="etiqueta" htmlFor="dni">
              DNI
            </label>
            <input id="dni" name="dni" inputMode="numeric" defaultValue={datos.dni ?? ''} className="campo" />
          </div>
          <div>
            <label className="etiqueta" htmlFor="direccion">
              Dirección
            </label>
            <input
              id="direccion"
              name="direccion"
              defaultValue={datos.direccion ?? ''}
              className="campo"
              placeholder="Jr. Los Sauces 145"
            />
          </div>
        </div>

        <div>
          <span className="etiqueta">Correo electrónico</span>
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
            {datos.email}
          </p>
          <p className="ayuda">El correo con el que entras no se puede cambiar desde aquí.</p>
        </div>
      </div>

      {error && (
        <p className="whitespace-pre-line rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}
      {ok && (
        <p className="rounded-xl border border-menta-300 bg-menta-50 px-4 py-3 text-sm font-semibold text-menta-700">
          ✅ Perfil actualizado.
        </p>
      )}

      <button type="submit" disabled={ocupado} className="btn-primario">
        {ocupado ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  )
}
