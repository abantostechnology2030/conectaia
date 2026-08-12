'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Avatar } from '@/components/Avatar'
import { Estrellas } from '@/components/Estrellas'
import { useConfirmar } from '@/components/Confirmar'
import { Chip } from '@/components/Chip'
import { POSTULACION } from '@/lib/estados'

export type OfertaVista = {
  id: number
  precio: number
  comentario: string
  tiempoEstimado: string | null
  disponibilidad: string | null
  fechaPropuesta: string | null
  estado: string
  autor: {
    id: number
    nombre: string
    fotoUrl: string | null
    ciudad: string | null
    reputacion: number
    calificaciones: number
    trabajosRealizados: number
  }
  servicio: { id: number; nombre: string } | null
  /**
   * Ya se pagó antes por el contacto con esta persona, así que aceptar su
   * oferta no cuesta nada (el cobro es por pareja, no por publicación).
   */
  yaDesbloqueado: boolean
}

/**
 * Comparador de ofertas recibidas (PDR §12-13).
 *
 * Lo que se muestra está fijado por el PDR: foto, nombre, calificación,
 * trabajos realizados, precio, comentario, tiempo y disponibilidad. Lo que NO
 * se muestra —teléfono, correo, dirección— tampoco viaja al navegador: el
 * servidor no lo incluye en `OfertaVista`, así que no basta con abrir las
 * herramientas del navegador para verlo.
 */
export default function Ofertas({
  necesidadId,
  necesidadTitulo,
  ofertas,
  creditos,
  costo,
  puedeAceptar,
}: {
  necesidadId: number
  necesidadTitulo: string
  ofertas: OfertaVista[]
  creditos: number
  costo: number
  /** Falso si la necesidad ya no está publicada. */
  puedeAceptar: boolean
}) {
  const router = useRouter()
  const { confirmar, dialogo } = useConfirmar()
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(0)

  // Cerrojo aparte del estado: `setOcupado` no surte efecto hasta el siguiente
  // pintado, así que dos pulsaciones seguidas entran las dos en `aceptar()`
  // antes de que el botón llegue a deshabilitarse. Con las dos peticiones en
  // vuelo a la vez, la segunda chocaba contra el índice único del trabajo y al
  // usuario le salía un error de base de datos.
  const enCurso = useRef(false)

  const sinSaldo = creditos < costo

  // Solo estorba el saldo cuando de verdad se va a cobrar. Si ya hay contacto
  // con TODAS las personas que ofertaron, el aviso de "recarga" no pinta nada.
  const algunaCuesta = ofertas.some((o) => o.estado === 'enviada' && !o.yaDesbloqueado)

  async function aceptar(o: OfertaVista) {
    if (enCurso.current) return
    setError('')

    // ⚠️ El saldo solo bloquea si esta oferta en concreto se va a cobrar. Antes
    // se miraba a secas, así que quien ya había pagado por ese contacto y se
    // había quedado sin créditos NO PODÍA aceptar la oferta — aunque aceptarla
    // no le costara nada. Era empujar al trato por fuera de la plataforma justo
    // en el último paso.
    if (sinSaldo && !o.yaDesbloqueado) {
      setError(
        `Necesitas ${costo} crédito(s) para desbloquear este contacto y tienes ${creditos}. Recarga para continuar.`,
      )
      return
    }

    const ok = await confirmar(
      o.yaDesbloqueado
        ? {
            titulo: '¿Aceptar esta oferta?',
            mensaje:
              'Ya tienes abierto el contacto con esta persona, así que aceptar NO te cuesta ningún crédito. Se creará el trabajo y, al terminarlo, podrán calificarse.',
            detalle: `${o.autor.nombre} · S/ ${o.precio.toFixed(2)}${o.tiempoEstimado ? ` · ${o.tiempoEstimado}` : ''}`,
            advertencia:
              'Las demás ofertas quedarán descartadas y esta necesidad dejará de recibir nuevas.',
            tono: 'aviso',
            botonConfirmar: 'Sí, aceptar',
          }
        : {
            titulo: '¿Aceptar esta oferta?',
            mensaje:
              'Al aceptar esta oferta se consumirá 1 crédito y se desbloquearán los datos de contacto necesarios para coordinar el trabajo.',
            detalle: `${o.autor.nombre} · S/ ${o.precio.toFixed(2)}${o.tiempoEstimado ? ` · ${o.tiempoEstimado}` : ''}`,
            advertencia: `Se consumirá ${costo} crédito. Las demás ofertas quedarán descartadas y esta necesidad dejará de recibir nuevas.`,
            tono: 'credito',
            botonConfirmar: 'Sí, aceptar y desbloquear',
          },
    )
    if (!ok) return

    enCurso.current = true
    setOcupado(o.id)

    const r = await fetch(`/api/necesidades/${necesidadId}/aceptar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postulacionId: o.id }),
    })
    const j = await r.json().catch(() => ({}))

    if (!r.ok) {
      // Solo se suelta el cerrojo si algo falló: hay que poder reintentar.
      enCurso.current = false
      setOcupado(0)
      setError(j.error ?? 'No se pudo aceptar la oferta.')
      return
    }

    // Si salió bien NO se reactiva el botón. La navegación tarda, y durante ese
    // rato un botón vivo invita a pulsarlo otra vez sobre algo ya aceptado.
    if (!j.trabajoId) {
      enCurso.current = false
      setOcupado(0)
      setError('La oferta se aceptó pero no pudimos abrir el trabajo. Revísalo en "Mis trabajos".')
      return
    }

    router.push(`/trabajos/${j.trabajoId}`)
    router.refresh()
  }

  if (ofertas.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
        <span className="text-3xl">📭</span>
        <h3 className="mt-2 font-bold text-slate-700">Aún no has recibido ofertas</h3>
        <p className="mt-1 text-sm text-slate-500">
          Te avisaremos en cuanto alguien se postule. Mientras tanto, revisa los servicios
          compatibles más abajo.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sinSaldo && puedeAceptar && algunaCuesta && (
        <p className="rounded-xl border border-sol-300 bg-sol-50 px-4 py-3 text-sm font-semibold text-sol-700">
          Tienes {creditos} crédito(s). Necesitas {costo} para aceptar una oferta de alguien con
          quien todavía no has abierto contacto.{' '}
          <Link href="/creditos" className="underline">
            Recargar créditos
          </Link>
        </p>
      )}

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}

      {ofertas.map((o) => (
        <article
          key={o.id}
          className={`tarjeta ${o.estado === 'seleccionada' ? 'border-menta-300 bg-menta-50' : ''}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar src={o.autor.fotoUrl} nombre={o.autor.nombre} tam={48} />
              <div className="min-w-0">
                {/* Se lleva de dónde viene para que el perfil ofrezca "Volver"
                    a esta misma comparación. Sin eso, mirar a tres personas
                    obliga a tirar del botón "atrás" tres veces. */}
                <Link
                  href={`/u/${o.autor.id}?volver=${encodeURIComponent(`/necesidades/${necesidadId}`)}`}
                  className="font-bold text-slate-800 hover:underline"
                >
                  {o.autor.nombre}
                </Link>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <Estrellas valor={o.autor.reputacion} total={o.autor.calificaciones} />
                  <span>{o.autor.trabajosRealizados} trabajo(s) realizados</span>
                  {o.autor.ciudad && <span>{o.autor.ciudad}</span>}
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-2xl font-extrabold text-marca-700">S/ {o.precio.toFixed(2)}</p>
              {o.estado !== 'enviada' && <Chip {...POSTULACION[o.estado]} />}
            </div>
          </div>

          <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{o.comentario}</p>

          {(o.tiempoEstimado || o.disponibilidad || o.servicio) && (
            <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              {o.tiempoEstimado && (
                <div>
                  <dt className="inline text-slate-500">Tiempo estimado: </dt>
                  <dd className="inline font-semibold text-slate-700">{o.tiempoEstimado}</dd>
                </div>
              )}
              {o.disponibilidad && (
                <div>
                  <dt className="inline text-slate-500">Disponibilidad: </dt>
                  <dd className="inline font-semibold text-slate-700">{o.disponibilidad}</dd>
                </div>
              )}
              {o.servicio && (
                <div>
                  <dt className="inline text-slate-500">Servicio: </dt>
                  <dd className="inline font-semibold text-slate-700">{o.servicio.nombre}</dd>
                </div>
              )}
            </dl>
          )}

          {puedeAceptar && o.estado === 'enviada' && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                // Se bloquean TODAS mientras haya una en vuelo, no solo esta:
                // aceptar una oferta descarta las demás, así que pulsar otra a
                // medias sería pedir algo que ya dejó de existir.
                disabled={ocupado !== 0}
                onClick={() => aceptar(o)}
                className="btn-primario"
              >
                {ocupado === o.id
                  ? 'Aceptando…'
                  : o.yaDesbloqueado
                    ? 'Aceptar oferta · sin coste'
                    : `Aceptar oferta · ${costo} crédito`}
              </button>
              <Link
                href={`/u/${o.autor.id}?volver=${encodeURIComponent(`/necesidades/${necesidadId}`)}`}
                className="btn-secundario"
              >
                Ver perfil
              </Link>
              <span className="text-xs text-slate-500">
                {o.yaDesbloqueado
                  ? 'Ya tienes su contacto: aceptar no te cuesta créditos y deja registrado el trabajo para poder calificarse.'
                  : 'Al aceptar se desbloquean los datos de contacto de ambos.'}
              </span>
            </div>
          )}
        </article>
      ))}

      <p className="text-xs text-slate-400">
        Los datos de contacto de quienes ofertan permanecen ocultos hasta que aceptes una oferta.
        Necesidad: {necesidadTitulo}.
      </p>

      {dialogo}
    </div>
  )
}
