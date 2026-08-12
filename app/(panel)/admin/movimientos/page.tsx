import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Encabezado } from '@/components/Encabezado'
import { Stat } from '@/components/Stat'
import { Vacio } from '@/components/Vacio'
import { Paginacion } from '@/components/Paginacion'
import { ETIQUETA_MOVIMIENTO } from '@/lib/creditos'
import { fechaHora } from '@/lib/fechas'

export const dynamic = 'force-dynamic'

const POR_PAGINA = 30

// Historial de créditos de toda la plataforma (PDR §31). Cada movimiento es
// auditable: quién, cuánto, por qué y con qué saldo quedó.
export default async function AdminMovimientos({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; p?: string }>
}) {
  const sp = await searchParams
  const tipo = sp.tipo ?? ''

  const donde = tipo ? { tipo } : {}
  const total = await prisma.movimientoCredito.count({ where: donde })
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA))
  const pagina = Math.min(Math.max(1, Number(sp.p) || 1), paginas)

  const [movimientos, porTipo] = await Promise.all([
    prisma.movimientoCredito.findMany({
      where: donde,
      include: {
        usuario: { select: { id: true, nombres: true, apellidos: true } },
        admin: { select: { nombres: true, apellidos: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    prisma.movimientoCredito.groupBy({ by: ['tipo'], _sum: { cantidad: true }, _count: true }),
  ])

  const suma = (t: string) => porTipo.find((x) => x.tipo === t)?._sum.cantidad ?? 0

  const FILTROS = [
    { id: '', label: 'Todos' },
    { id: 'recarga', label: 'Recargas' },
    { id: 'consumo', label: 'Consumos' },
    { id: 'devolucion', label: 'Devoluciones' },
    { id: 'ajuste', label: 'Ajustes' },
  ]

  return (
    <div className="space-y-6">
      <Encabezado titulo="Movimientos de créditos" subtitulo={`${total} movimiento(s)`} icono="movimiento" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat titulo="Recargados" valor={suma('recarga')} icono="paquete" tono="menta" />
        <Stat titulo="Consumidos" valor={Math.abs(suma('consumo'))} icono="creditos" tono="cielo" />
        <Stat titulo="Devueltos" valor={suma('devolucion')} icono="movimiento" tono="sol" />
        <Stat titulo="Ajustes" valor={suma('ajuste')} icono="config" tono="gris" />
      </div>

      <div className="scroll-x flex gap-2">
        {FILTROS.map((f) => (
          <Link
            key={f.id}
            href={f.id ? `/admin/movimientos?tipo=${f.id}` : '/admin/movimientos'}
            className={`chip whitespace-nowrap ${
              tipo === f.id
                ? 'border-marca-500 bg-marca-500 text-white'
                : 'border-slate-300 bg-white text-slate-600'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {movimientos.length === 0 ? (
        <Vacio emoji="💳" titulo="No hay movimientos con ese filtro" />
      ) : (
        <div className="tarjeta scroll-x">
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Tipo</th>
                <th>Motivo</th>
                <th className="text-right">Créditos</th>
                <th className="text-right">Saldo</th>
                <th>Aplicado por</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap text-slate-500">{fechaHora(m.createdAt)}</td>
                  <td className="whitespace-nowrap">
                    <Link href={`/u/${m.usuario.id}`} className="font-semibold hover:underline">
                      {m.usuario.nombres} {m.usuario.apellidos}
                    </Link>
                  </td>
                  <td>
                    <span
                      className={`chip ${
                        m.cantidad > 0
                          ? 'border-menta-300 bg-menta-50 text-menta-700'
                          : 'border-rose-200 bg-rose-50 text-rose-700'
                      }`}
                    >
                      {ETIQUETA_MOVIMIENTO[m.tipo] ?? m.tipo}
                    </span>
                  </td>
                  <td className="max-w-72">{m.motivo}</td>
                  <td
                    className={`text-right font-extrabold ${
                      m.cantidad > 0 ? 'text-menta-700' : 'text-rose-600'
                    }`}
                  >
                    {m.cantidad > 0 ? '+' : ''}
                    {m.cantidad}
                  </td>
                  <td className="text-right font-semibold text-slate-600">{m.saldoDespues}</td>
                  <td className="whitespace-nowrap text-slate-500">
                    {m.admin ? `${m.admin.nombres} ${m.admin.apellidos}` : 'Sistema'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Paginacion pagina={pagina} paginas={paginas} base="/admin/movimientos" params={{ tipo }} />
    </div>
  )
}
