import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Encabezado } from '@/components/Encabezado'
import GestorPaquetes, { type PaqueteAdmin } from './GestorPaquetes'

export const dynamic = 'force-dynamic'

export default async function AdminPaquetes() {
  const paquetes = await prisma.paqueteCredito.findMany({
    include: { _count: { select: { recargas: true } } },
    orderBy: { orden: 'asc' },
  })

  const datos: PaqueteAdmin[] = paquetes.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    creditos: p.creditos,
    precio: p.precio,
    activo: p.activo,
    recargas: p._count.recargas,
  }))

  return (
    <div className="space-y-6">
      {/* Igual que en categorías: fuera del menú, la vuelta va aquí. */}
      <Encabezado
        titulo="Paquetes de créditos"
        subtitulo={`${datos.length} paquete(s)`}
        icono="paquete"
      >
        <Link href="/admin/configuracion" className="btn-secundario">
          Volver a Configuración
        </Link>
      </Encabezado>

      <p className="rounded-xl border border-marca-200 bg-marca-50 px-4 py-3 text-sm text-marca-800">
        Estos son los paquetes que el usuario ve al recargar. Los valores iniciales son solo un
        ejemplo: cámbialos según lo que decidas cobrar.
      </p>

      <GestorPaquetes paquetes={datos} />
    </div>
  )
}
