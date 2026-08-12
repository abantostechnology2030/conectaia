import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Encabezado } from '@/components/Encabezado'
import { Icono } from '@/components/Icono'
import { getConfig, asegurarConfig } from '@/lib/config'
import ConfiguracionForm from './ConfiguracionForm'

export const dynamic = 'force-dynamic'

/**
 * Configuración: los parámetros del sistema y la puerta al catálogo.
 *
 * Las categorías y los paquetes de créditos NO están en el menú lateral y se
 * entra a ellos desde aquí. Son ajustes que se tocan de vez en cuando, y
 * tenerlos arriba —al lado de las colas que sí piden atención a diario— alargaba
 * el menú sin que ninguno de los dos lo mereciera. Siguen viviendo en sus
 * propias direcciones: lo único que cambia es por dónde se llega.
 */
export default async function AdminConfiguracion() {
  // Se crean las filas que falten al abrir la pantalla: así una base sin seed
  // (o con claves nuevas añadidas después) no se queda a medias.
  await asegurarConfig()

  const [cfg, categorias, categoriasActivas, subcategorias, paquetes, paquetesActivos] =
    await Promise.all([
      getConfig(),
      prisma.categoria.count(),
      prisma.categoria.count({ where: { activa: true } }),
      prisma.subcategoria.count(),
      prisma.paqueteCredito.count(),
      prisma.paqueteCredito.count({ where: { activo: true } }),
    ])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Encabezado titulo="Configuración" subtitulo="Parámetros del sistema y catálogo" icono="config" />

      <ConfiguracionForm cfg={cfg} />

      {/* El catálogo. Se enseñan las cifras para que no haya que entrar solo a
          mirar cómo está la cosa. */}
      <section>
        <h2 className="mb-3 text-lg font-extrabold text-slate-800">Catálogo</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Ajuste
            href="/admin/categorias"
            icono="catalogo"
            color="text-marca-500"
            titulo="Categorías"
            resumen={`${categoriasActivas} de ${categorias} activas · ${subcategorias} subcategorías`}
            descripcion="Los rubros entre los que elige la gente al publicar. Lo que está en uso se desactiva, no se borra."
          />
          <Ajuste
            href="/admin/paquetes"
            icono="paquete"
            color="text-menta-500"
            titulo="Paquetes de créditos"
            resumen={`${paquetesActivos} de ${paquetes} activos`}
            descripcion="Cuántos créditos se venden y a qué precio. Es lo que ve el usuario al recargar por Yape."
          />
        </div>
      </section>
    </div>
  )
}

function Ajuste({
  href,
  icono,
  color,
  titulo,
  resumen,
  descripcion,
}: {
  href: string
  icono: 'catalogo' | 'paquete'
  color: string
  titulo: string
  resumen: string
  descripcion: string
}) {
  return (
    <Link href={href} className="tarjeta flex flex-col">
      <div className="flex items-center gap-3">
        <span className={color}>
          <Icono nombre={icono} className="h-6 w-6" />
        </span>
        <h3 className="font-bold text-slate-800">{titulo}</h3>
        <Icono nombre="chevron" className="ml-auto h-5 w-5 shrink-0 text-slate-300" />
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-600">{resumen}</p>
      <p className="mt-1 flex-1 text-sm text-slate-500">{descripcion}</p>
    </Link>
  )
}
