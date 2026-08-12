import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Encabezado } from '@/components/Encabezado'
import { Stat } from '@/components/Stat'
import { soles, haceDias } from '@/lib/fechas'

export const dynamic = 'force-dynamic'

// Estadísticas administrativas (PDR §40).
export default async function AdminPanel() {
  const hace30 = haceDias(30)

  const [
    usuariosTotal,
    usuariosActivos,
    usuariosSuspendidos,
    usuariosNuevos,
    necPublicadas,
    necActivas,
    necFinalizadas,
    necCanceladas,
    srvActivos,
    srvPausados,
    srvDesactivados,
    postTotal,
    postPorCategoria,
    matchTotal,
    matchVistos,
    matchPostulados,
    matchContactados,
    recargasPendientes,
    creditosVendidos,
    creditosConsumidos,
    creditosDevueltos,
    ingresos,
    trabContratados,
    trabProceso,
    trabFinalizados,
    trabCancelados,
    alertasSinRevisar,
    calificacionesTotal,
  ] = await Promise.all([
    prisma.usuario.count({ where: { rol: 'usuario' } }),
    prisma.usuario.count({ where: { rol: 'usuario', estado: 'activo' } }),
    prisma.usuario.count({ where: { rol: 'usuario', estado: 'suspendido' } }),
    prisma.usuario.count({ where: { rol: 'usuario', createdAt: { gte: hace30 } } }),

    prisma.necesidad.count({ where: { estado: { not: 'borrador' } } }),
    prisma.necesidad.count({ where: { estado: 'publicada' } }),
    prisma.necesidad.count({ where: { estado: 'finalizada' } }),
    prisma.necesidad.count({ where: { estado: 'cancelada' } }),

    prisma.servicio.count({ where: { estado: 'publicado' } }),
    prisma.servicio.count({ where: { estado: 'pausado' } }),
    prisma.servicio.count({ where: { estado: 'desactivado' } }),

    prisma.postulacion.count(),
    prisma.postulacion.groupBy({ by: ['necesidadId'], _count: true }),

    prisma.match.count(),
    prisma.match.count({ where: { vistoAt: { not: null } } }),
    prisma.match.count({ where: { postuloAt: { not: null } } }),
    prisma.match.count({ where: { contactoAt: { not: null } } }),

    prisma.recarga.count({ where: { estado: 'pendiente' } }),
    prisma.movimientoCredito.aggregate({ where: { tipo: 'recarga' }, _sum: { cantidad: true } }),
    prisma.movimientoCredito.aggregate({ where: { tipo: 'consumo' }, _sum: { cantidad: true } }),
    prisma.movimientoCredito.aggregate({ where: { tipo: 'devolucion' }, _sum: { cantidad: true } }),
    prisma.recarga.aggregate({ where: { estado: 'aprobada' }, _sum: { monto: true } }),

    prisma.trabajo.count(),
    prisma.trabajo.count({ where: { estado: 'en_proceso' } }),
    prisma.trabajo.count({ where: { estado: 'finalizado' } }),
    prisma.trabajo.count({ where: { estado: 'cancelado' } }),

    prisma.alertaModeracion.count({ where: { revisada: false } }),
    prisma.calificacion.count(),
  ])

  // Promedio de postulaciones por necesidad: se calcula sobre las necesidades
  // que SÍ recibieron alguna, no sobre todas. Dividir entre todas mezclaría
  // "poca demanda" con "nadie se postuló", que son problemas distintos.
  const promedioPost =
    postPorCategoria.length > 0 ? (postTotal / postPorCategoria.length).toFixed(1) : '0'

  const porcentaje = (parte: number, total: number) =>
    total === 0 ? '0%' : `${Math.round((parte / total) * 100)}%`

  return (
    <div className="space-y-8">
      <Encabezado titulo="Panel de administración" subtitulo="Estado de ConectaIA" icono="panel" />

      {/* Lo que requiere acción va primero. */}
      {(recargasPendientes > 0 || alertasSinRevisar > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {recargasPendientes > 0 && (
            <Link
              href="/admin/recargas"
              className="elevar flex items-center gap-3 rounded-2xl border border-sol-300 bg-sol-50 px-5 py-4"
            >
              <span className="text-2xl">💳</span>
              <div>
                <p className="font-bold text-sol-700">
                  {recargasPendientes} recarga(s) esperando revisión
                </p>
                <p className="text-sm text-slate-600">Verifica los comprobantes y aprueba o rechaza.</p>
              </div>
            </Link>
          )}
          {alertasSinRevisar > 0 && (
            <Link
              href="/admin/moderacion"
              className="elevar flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4"
            >
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-bold text-rose-700">
                  {alertasSinRevisar} alerta(s) de moderación sin revisar
                </p>
                <p className="text-sm text-slate-600">Posibles intentos de evadir el sistema de créditos.</p>
              </div>
            </Link>
          )}
        </div>
      )}

      <Seccion titulo="Usuarios">
        <Stat titulo="Total" valor={usuariosTotal} icono="usuarios" tono="marca" href="/admin/usuarios" />
        <Stat titulo="Activos" valor={usuariosActivos} icono="usuarios" tono="menta" />
        <Stat titulo="Suspendidos" valor={usuariosSuspendidos} icono="alerta" tono="rosa" />
        <Stat titulo="Nuevos" valor={usuariosNuevos} icono="mas" tono="cielo" pie="últimos 30 días" />
      </Seccion>

      <Seccion titulo="Necesidades">
        <Stat titulo="Publicadas" valor={necPublicadas} icono="busco" tono="marca" href="/admin/necesidades" />
        <Stat titulo="Activas" valor={necActivas} icono="busco" tono="cielo" />
        <Stat titulo="Finalizadas" valor={necFinalizadas} icono="trabajo" tono="menta" />
        <Stat titulo="Canceladas" valor={necCanceladas} icono="alerta" tono="rosa" />
      </Seccion>

      <Seccion titulo="Servicios">
        <Stat titulo="Activos" valor={srvActivos} icono="ofrezco" tono="menta" href="/admin/servicios" />
        <Stat titulo="Pausados" valor={srvPausados} icono="reloj" tono="sol" />
        <Stat titulo="Desactivados" valor={srvDesactivados} icono="alerta" tono="gris" />
        <Stat titulo="Calificaciones" valor={calificacionesTotal} icono="estrella" tono="marca" href="/admin/calificaciones" />
      </Seccion>

      <Seccion titulo="Postulaciones">
        <Stat titulo="Total" valor={postTotal} icono="oferta" tono="sol" href="/admin/postulaciones" />
        <Stat
          titulo="Necesidades con ofertas"
          valor={postPorCategoria.length}
          icono="busco"
          tono="cielo"
        />
        <Stat
          titulo="Promedio por necesidad"
          valor={promedioPost}
          icono="grafico"
          tono="marca"
          pie="entre las que recibieron alguna"
        />
      </Seccion>

      {/* El embudo del matching es la métrica que dice si ConectaIA cumple su
          promesa: detectar coincidencias que acaben en trabajos reales. */}
      <Seccion titulo="Matching">
        <Stat titulo="Detectadas" valor={matchTotal} icono="match" tono="marca" href="/admin/matching" />
        <Stat
          titulo="Consultadas"
          valor={matchVistos}
          icono="buscar"
          tono="cielo"
          pie={porcentaje(matchVistos, matchTotal)}
        />
        <Stat
          titulo="Generaron postulación"
          valor={matchPostulados}
          icono="oferta"
          tono="sol"
          pie={porcentaje(matchPostulados, matchTotal)}
        />
        <Stat
          titulo="Generaron contacto"
          valor={matchContactados}
          icono="trabajo"
          tono="menta"
          pie={porcentaje(matchContactados, matchTotal)}
        />
      </Seccion>

      <Seccion titulo="Créditos">
        <Stat
          titulo="Vendidos"
          valor={creditosVendidos._sum.cantidad ?? 0}
          icono="paquete"
          tono="menta"
          href="/admin/movimientos"
        />
        <Stat
          titulo="Consumidos"
          valor={Math.abs(creditosConsumidos._sum.cantidad ?? 0)}
          icono="creditos"
          tono="cielo"
        />
        <Stat
          titulo="Devueltos"
          valor={creditosDevueltos._sum.cantidad ?? 0}
          icono="movimiento"
          tono="sol"
        />
        <Stat
          titulo="Ingresos"
          valor={soles(ingresos._sum.monto ?? 0, 'S/ 0.00')}
          icono="grafico"
          tono="marca"
          pie="recargas aprobadas"
        />
      </Seccion>

      <Seccion titulo="Trabajos">
        <Stat titulo="Contratados" valor={trabContratados} icono="trabajo" tono="marca" />
        <Stat titulo="En proceso" valor={trabProceso} icono="reloj" tono="sol" />
        <Stat titulo="Finalizados" valor={trabFinalizados} icono="trabajo" tono="menta" />
        <Stat titulo="Cancelados" valor={trabCancelados} icono="alerta" tono="rosa" />
      </Seccion>
    </div>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-extrabold text-slate-800">{titulo}</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
    </section>
  )
}
