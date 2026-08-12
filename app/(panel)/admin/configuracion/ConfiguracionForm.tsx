'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Cfg = Record<string, string>

// Parámetros del sistema. Solo se envían las claves que este formulario
// conoce: la API además ignora cualquier otra, para que un campo de más no
// cree filas basura en la tabla de configuración.
export default function ConfiguracionForm({ cfg }: { cfg: Cfg }) {
  const router = useRouter()
  const [valores, setValores] = useState<Cfg>(cfg)
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  const set = (clave: string, valor: string) => setValores((v) => ({ ...v, [clave]: valor }))

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setOk(false)
    setOcupado(true)

    // El QR se sube aparte porque es un archivo; aquí solo van los textos.
    const { yape_qr, ...resto } = valores
    void yape_qr

    const r = await fetch('/api/admin/configuracion', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resto),
    })
    const j = await r.json().catch(() => ({}))
    setOcupado(false)

    if (!r.ok) {
      setError(j.error ?? 'No se pudo guardar.')
      return
    }
    setOk(true)
    router.refresh()
  }

  async function subirQr(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return

    setError('')
    setOcupado(true)
    const fd = new FormData()
    fd.append('yape_qr', archivo)

    const r = await fetch('/api/admin/configuracion', { method: 'PATCH', body: fd })
    const j = await r.json().catch(() => ({}))
    setOcupado(false)

    if (!r.ok) {
      setError(j.error ?? 'No se pudo subir el QR.')
      return
    }
    set('yape_qr', j.url)
    router.refresh()
  }

  return (
    <form onSubmit={guardar} className="space-y-6">
      <div className="tarjeta space-y-4">
        <h2 className="font-bold text-slate-700">Plataforma</h2>

        <Texto
          clave="plataforma_nombre"
          etiqueta="Nombre"
          valor={valores.plataforma_nombre}
          alCambiar={set}
        />
        <Texto clave="plataforma_lema" etiqueta="Lema" valor={valores.plataforma_lema} alCambiar={set} />

        <Interruptor
          clave="registro_abierto"
          etiqueta="Registro abierto"
          ayuda="Si lo apagas, nadie puede crear cuenta por su cuenta."
          valor={valores.registro_abierto}
          alCambiar={set}
        />

        <Numero
          clave="creditos_bienvenida"
          etiqueta="Créditos de bienvenida"
          ayuda="Los que se regalan al crear una cuenta. Pon 0 para no regalar ninguno."
          valor={valores.creditos_bienvenida}
          alCambiar={set}
        />
      </div>

      <div className="tarjeta space-y-4">
        <h2 className="font-bold text-slate-700">Créditos</h2>

        <Numero
          clave="costo_desbloqueo"
          etiqueta="Créditos por desbloqueo"
          ayuda="Cuánto cuesta desbloquear un contacto. El PDR define 1 = 1."
          valor={valores.costo_desbloqueo}
          alCambiar={set}
        />
      </div>

      <div className="tarjeta space-y-4">
        <h2 className="font-bold text-slate-700">Pagos por Yape</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Texto clave="yape_numero" etiqueta="Número de Yape" valor={valores.yape_numero} alCambiar={set} />
          <Texto clave="yape_titular" etiqueta="Titular" valor={valores.yape_titular} alCambiar={set} />
        </div>

        <div>
          <label className="etiqueta" htmlFor="qr">
            Código QR
          </label>
          {valores.yape_qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={valores.yape_qr}
              alt="QR de Yape"
              className="mb-2 max-h-44 rounded-xl border border-slate-200 object-contain"
            />
          )}
          <input
            id="qr"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={subirQr}
            className="campo"
          />
          <p className="ayuda">Se sube al elegirlo, sin esperar a &laquo;Guardar&raquo;.</p>
        </div>
      </div>

      <div className="tarjeta space-y-4">
        <h2 className="font-bold text-slate-700">Matching</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Numero
            clave="match_minimo"
            etiqueta="Compatibilidad mínima (%)"
            ayuda="Por debajo de este puntaje la coincidencia no se guarda ni se muestra."
            valor={valores.match_minimo}
            alCambiar={set}
          />
          <Numero
            clave="match_max_resultados"
            etiqueta="Máximo de resultados"
            ayuda="Cuántas coincidencias se listan por publicación."
            valor={valores.match_max_resultados}
            alCambiar={set}
          />
        </div>
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
          Cambiar el mínimo no rehace las coincidencias ya guardadas: se aplica a partir del próximo
          cálculo, es decir, cuando alguien publique o edite algo.
        </p>
      </div>

      <div className="tarjeta space-y-4">
        <h2 className="font-bold text-slate-700">Protección del sistema de créditos</h2>

        <Interruptor
          clave="antievasion_bloquea"
          etiqueta="Bloquear textos con datos de contacto"
          ayuda="Encendido: no se publica y el usuario ve por qué. Apagado: se publica igual y solo queda la alerta en Moderación."
          valor={valores.antievasion_bloquea}
          alCambiar={set}
        />
      </div>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}
      {ok && (
        <p className="rounded-xl border border-menta-300 bg-menta-50 px-4 py-3 text-sm font-semibold text-menta-700">
          ✅ Configuración guardada.
        </p>
      )}

      <button type="submit" disabled={ocupado} className="btn-primario">
        {ocupado ? 'Guardando…' : 'Guardar configuración'}
      </button>
    </form>
  )
}

function Texto({
  clave,
  etiqueta,
  valor,
  alCambiar,
}: {
  clave: string
  etiqueta: string
  valor: string
  alCambiar: (c: string, v: string) => void
}) {
  return (
    <div>
      <label className="etiqueta" htmlFor={clave}>
        {etiqueta}
      </label>
      <input
        id={clave}
        value={valor ?? ''}
        onChange={(e) => alCambiar(clave, e.target.value)}
        className="campo"
      />
    </div>
  )
}

function Numero({
  clave,
  etiqueta,
  ayuda,
  valor,
  alCambiar,
}: {
  clave: string
  etiqueta: string
  ayuda?: string
  valor: string
  alCambiar: (c: string, v: string) => void
}) {
  return (
    <div>
      <label className="etiqueta" htmlFor={clave}>
        {etiqueta}
      </label>
      <input
        id={clave}
        type="number"
        min="0"
        value={valor ?? ''}
        onChange={(e) => alCambiar(clave, e.target.value)}
        className="campo"
      />
      {ayuda && <p className="ayuda">{ayuda}</p>}
    </div>
  )
}

function Interruptor({
  clave,
  etiqueta,
  ayuda,
  valor,
  alCambiar,
}: {
  clave: string
  etiqueta: string
  ayuda?: string
  valor: string
  alCambiar: (c: string, v: string) => void
}) {
  const activo = valor === '1' || valor === 'true'
  return (
    <div className="flex items-start gap-3">
      <input
        id={clave}
        type="checkbox"
        checked={activo}
        onChange={(e) => alCambiar(clave, e.target.checked ? '1' : '0')}
        className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 text-marca-600 focus:ring-marca-400"
      />
      <label htmlFor={clave} className="min-w-0">
        <span className="block text-sm font-semibold text-slate-700">{etiqueta}</span>
        {ayuda && <span className="block text-xs text-slate-500">{ayuda}</span>}
      </label>
    </div>
  )
}
