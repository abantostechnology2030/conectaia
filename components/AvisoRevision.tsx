import { enRevision, rechazado } from '@/lib/estados'

/**
 * Lo que ve el dueño de una publicación que aún no está visible.
 *
 * Existe porque, sin él, alguien pulsa "Publicar", vuelve al listado y no
 * encuentra su anuncio en el escaparate: da por hecho que se perdió y lo vuelve
 * a publicar, o se va. Decir "lo estamos revisando" cuesta una frase y evita
 * las dos cosas.
 *
 * El motivo del rechazo se enseña tal cual lo escribió el administrador: un
 * "no aprobado" sin explicación deja al usuario sin nada que corregir.
 */
export function AvisoRevision({
  estado,
  motivo,
  que,
}: {
  estado: string
  motivo?: string | null
  /** "necesidad" u "servicio", para que la frase suene natural. */
  que: 'necesidad' | 'servicio'
}) {
  if (enRevision(estado)) {
    return (
      <div className="rounded-2xl border-2 border-sol-300 bg-sol-50 px-5 py-4">
        <p className="font-bold text-sol-900">⏳ Estamos revisando tu {que}</p>
        <p className="mt-1 text-sm text-sol-800">
          Un administrador la revisa antes de publicarla. En cuanto la apruebe se publicará sola y
          te avisaremos — no tienes que volver a enviarla. Mientras tanto no la ve nadie más.
        </p>
      </div>
    )
  }

  if (rechazado(estado)) {
    return (
      <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 px-5 py-4">
        <p className="font-bold text-rose-800">⚠️ Tu {que} no fue aprobada</p>
        {motivo && (
          <p className="mt-1 whitespace-pre-line text-sm text-rose-700">
            <span className="font-semibold">Motivo: </span>
            {motivo}
          </p>
        )}
        <p className="mt-2 text-sm text-rose-700">
          Corrige lo que se indica y vuelve a enviarla: al editarla y guardarla entra otra vez en
          revisión.
        </p>
      </div>
    )
  }

  return null
}
