'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useConfirmar } from '@/components/Confirmar'

/**
 * Las dos decisiones del proveedor ante una oportunidad (PDR §22).
 *
 * · POSTULARME  — gratis. Manda una oferta y espera respuesta.
 * · CONTACTAR   — cuesta 1 crédito. Desbloquea el contacto y permite hablar ya.
 *
 * Las dos están al mismo nivel y con el coste escrito en el propio botón: el
 * PDR es explícito en que el sistema muestra la coincidencia pero NUNCA
 * contacta ni contrata por su cuenta. La decisión es siempre del usuario.
 */
export default function AccionesOportunidad({
  matchId,
  necesidadId,
  necesidadTitulo,
  servicioId,
  precioSugerido,
  creditos,
  costo,
  yaPostulado,
  yaContactado,
}: {
  matchId: number
  necesidadId: number
  necesidadTitulo: string
  servicioId: number
  precioSugerido: number | null
  creditos: number
  costo: number
  yaPostulado: boolean
  yaContactado: boolean
}) {
  const router = useRouter()
  const { confirmar, dialogo } = useConfirmar()
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [abierto, setAbierto] = useState(false)

  const sinSaldo = creditos < costo

  async function postular(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setOcupado(true)

    const d = new FormData(e.currentTarget)
    const r = await fetch('/api/postulaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        necesidadId,
        servicioId,
        precio: d.get('precio'),
        comentario: d.get('comentario'),
        tiempoEstimado: d.get('tiempoEstimado'),
        disponibilidad: d.get('disponibilidad'),
        fechaPropuesta: d.get('fechaPropuesta'),
      }),
    })
    const j = await r.json().catch(() => ({}))
    setOcupado(false)

    if (!r.ok) {
      setError(j.error ?? 'No se pudo enviar la oferta.')
      return
    }

    setAbierto(false)
    router.push('/postulaciones')
    router.refresh()
  }

  async function contactar() {
    setError('')

    if (sinSaldo) {
      setError(
        `Necesitas ${costo} crédito(s) para desbloquear este contacto y tienes ${creditos}. Recarga para continuar.`,
      )
      return
    }

    const ok = await confirmar({
      titulo: '¿Desbloquear el contacto?',
      mensaje:
        'Se consumirá 1 crédito y se desbloquearán los datos de contacto necesarios para coordinar el trabajo. La otra persona no pagará nada por este mismo contacto.',
      detalle: necesidadTitulo,
      advertencia: `Se consumirá ${costo} crédito. Desbloquear no crea una contratación: solo abre el canal para que puedan hablar.`,
      tono: 'credito',
      botonConfirmar: 'Sí, desbloquear contacto',
    })
    if (!ok) return

    setOcupado(true)
    const r = await fetch(`/api/oportunidades/${matchId}/contactar`, { method: 'POST' })
    const j = await r.json().catch(() => ({}))
    setOcupado(false)

    if (!r.ok) {
      setError(j.error ?? 'No se pudo desbloquear el contacto.')
      return
    }
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {yaPostulado ? (
          <span className="chip border-menta-300 bg-menta-50 text-menta-700">
            ✅ Ya enviaste tu oferta
          </span>
        ) : (
          <button type="button" onClick={() => setAbierto((a) => !a)} className="btn-primario">
            {abierto ? 'Cerrar formulario' : 'Postularme (gratis)'}
          </button>
        )}

        {!yaContactado && (
          <button type="button" disabled={ocupado} onClick={contactar} className="btn-secundario">
            Contactar ahora · {costo} crédito
          </button>
        )}
      </div>

      {!yaPostulado && (
        <p className="text-xs text-slate-500">
          Postularte no cuesta nada: envías tu oferta y esperas respuesta. Solo se consume un crédito
          si decides desbloquear el contacto tú mismo, o si aceptan tu oferta (en ese caso paga quien
          la acepta).
        </p>
      )}

      {sinSaldo && !yaContactado && (
        <p className="rounded-xl border border-sol-300 bg-sol-50 px-4 py-2.5 text-sm text-sol-700">
          Tienes {creditos} crédito(s).{' '}
          <Link href="/creditos" className="font-bold underline">
            Recargar
          </Link>
        </p>
      )}

      {abierto && !yaPostulado && (
        <form onSubmit={postular} className="tarjeta space-y-4">
          <h3 className="font-bold text-slate-700">Tu oferta</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="etiqueta" htmlFor="precio">
                Precio que ofreces (S/) <span className="text-rose-500">*</span>
              </label>
              <input
                id="precio"
                name="precio"
                type="number"
                min="1"
                step="0.01"
                required
                defaultValue={precioSugerido ?? ''}
                className="campo"
              />
            </div>
            <div>
              <label className="etiqueta" htmlFor="tiempoEstimado">
                Tiempo estimado
              </label>
              <input id="tiempoEstimado" name="tiempoEstimado" className="campo" placeholder="4 horas" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="etiqueta" htmlFor="disponibilidad">
                Disponibilidad
              </label>
              <input
                id="disponibilidad"
                name="disponibilidad"
                className="campo"
                placeholder="Mañana por la mañana"
              />
            </div>
            <div>
              <label className="etiqueta" htmlFor="fechaPropuesta">
                Fecha propuesta
              </label>
              <input id="fechaPropuesta" name="fechaPropuesta" type="date" className="campo" />
            </div>
          </div>

          <div>
            <label className="etiqueta" htmlFor="comentario">
              Comentario <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="comentario"
              name="comentario"
              required
              minLength={10}
              rows={4}
              className="campo"
              placeholder="Ej: Puedo realizar el trabajo mañana. Incluye lijado y resanado. Los materiales corren por cuenta del cliente."
            />
            <p className="ayuda">
              No escribas tu teléfono ni tu correo: se comparten solos si aceptan tu oferta.
            </p>
          </div>

          <button type="submit" disabled={ocupado} className="btn-primario w-full">
            {ocupado ? 'Enviando…' : 'Enviar mi oferta'}
          </button>
        </form>
      )}

      {dialogo}
    </div>
  )
}
