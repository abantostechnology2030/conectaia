import { Icono } from './Icono'
import { OCULTO } from '@/lib/contacto'

/**
 * Caja de datos de contacto. Es el punto donde se hace visible la regla de
 * negocio: antes del desbloqueo se ve que los datos EXISTEN pero no cuáles
 * son; después se ven completos y con enlaces directos.
 *
 * Enseñar los campos tapados en vez de esconder la caja entera es deliberado:
 * el usuario entiende qué está comprando.
 */
export function DatosContacto({
  visible,
  datos,
  nombre,
  aviso,
}: {
  visible: boolean
  datos: { celular: string | null; whatsapp: string | null; email: string | null; direccion: string | null } | null
  nombre: string
  /** Texto que explica cómo se desbloquea, cuando aún no lo está. */
  aviso?: string
}) {
  if (!visible || !datos) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="flex items-center gap-2 font-bold text-slate-700">
          <Icono nombre="candado" className="h-5 w-5 text-slate-400" />
          Datos de contacto protegidos
        </h3>
        <dl className="mt-3 space-y-2 text-sm">
          <Fila etiqueta="Celular" valor={<span className="oculto-credito">{OCULTO}</span>} />
          <Fila etiqueta="WhatsApp" valor={<span className="oculto-credito">{OCULTO}</span>} />
          <Fila etiqueta="Correo" valor={<span className="oculto-credito">{OCULTO}</span>} />
        </dl>
        <p className="mt-3 text-xs text-slate-500">
          {aviso ?? 'Los datos de contacto se muestran cuando alguna de las dos partes decide conectar.'}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-menta-300 bg-menta-50 p-5">
      <h3 className="flex items-center gap-2 font-bold text-menta-800">
        <span aria-hidden="true">✅</span>
        Contacto desbloqueado
      </h3>
      <p className="mt-1 text-sm text-menta-700">Ya pueden coordinar directamente con {nombre}.</p>

      <dl className="mt-3 space-y-2 text-sm">
        {datos.celular && (
          <Fila
            etiqueta="Celular"
            valor={
              <a href={`tel:${datos.celular}`} className="font-bold text-menta-800 hover:underline">
                {datos.celular}
              </a>
            }
          />
        )}
        {datos.whatsapp && (
          <Fila
            etiqueta="WhatsApp"
            valor={
              <a
                href={`https://wa.me/51${datos.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-menta-800 hover:underline"
              >
                {datos.whatsapp}
              </a>
            }
          />
        )}
        {datos.email && (
          <Fila
            etiqueta="Correo"
            valor={
              <a href={`mailto:${datos.email}`} className="font-bold text-menta-800 hover:underline">
                {datos.email}
              </a>
            }
          />
        )}
        {datos.direccion && <Fila etiqueta="Dirección" valor={<span>{datos.direccion}</span>} />}
      </dl>
    </div>
  )
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500">{etiqueta}</dt>
      <dd>{valor}</dd>
    </div>
  )
}
