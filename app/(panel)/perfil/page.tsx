import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { Encabezado } from '@/components/Encabezado'
import { Estrellas } from '@/components/Estrellas'
import { reputacionDe } from '@/lib/reputacion'
import { antiguedad } from '@/lib/fechas'
import PerfilForm from './PerfilForm'
import CambiarPassword from './CambiarPassword'
import CambiarModo from './CambiarModo'

export const dynamic = 'force-dynamic'

export default async function Perfil() {
  const session = await auth()
  const usuarioId = Number(session!.user.id)

  const yo = await prisma.usuario.findUnique({ where: { id: usuarioId } })
  if (!yo) notFound()

  const reputacion = await reputacionDe(usuarioId)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Encabezado titulo="Mi perfil" subtitulo={`Miembro desde ${antiguedad(yo.createdAt)}`} icono="perfil">
        {yo.rol === 'usuario' && (
          <Link href={`/u/${yo.id}`} className="btn-secundario">
            Ver mi perfil público
          </Link>
        )}
      </Encabezado>

      {yo.rol === 'usuario' && (
        <div className="tarjeta">
          <h2 className="font-bold text-slate-700">Mi reputación</h2>
          <div className="mt-2">
            <Estrellas valor={reputacion.promedio} total={reputacion.total} tam="lg" />
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {reputacion.trabajosRealizados} trabajo(s) realizados ·{' '}
            {reputacion.trabajosContratados} contratados
          </p>
        </div>
      )}

      {yo.rol === 'usuario' && <CambiarModo modo={yo.modo} />}

      <PerfilForm datos={yo} />
      <CambiarPassword />
    </div>
  )
}
