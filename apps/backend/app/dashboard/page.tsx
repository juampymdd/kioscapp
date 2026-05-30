import Link from 'next/link'
import { getSession } from '@/src/lib/session'
import { getDashboardData } from './_lib/dashboard-data'
import {
  VentasPorDiaChart, MediosPagoChart, VentasPorHoraChart,
  TopProductosChart, SucursalChart, CategoriaChart,
} from './_components/DashboardCharts'

function formatPesos(centavos: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format((centavos ?? 0) / 100)
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1.5 ${accent ?? 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

function ChartCard({ title, subtitle, className, children }: { title: string; subtitle?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 ${className ?? ''}`}>
      <div className="mb-3">
        <h3 className="text-white font-semibold text-sm">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

export default async function DashboardPage() {
  const session = await getSession()
  const data = await getDashboardData(session.userId)
  const sinSucursales = data.sucursales.length === 0

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Resumen</h1>
          <p className="text-slate-400 text-sm mt-1">Estadísticas de los últimos 30 días</p>
        </div>
        <Link
          href="/dashboard/sucursales/nueva"
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors shrink-0"
        >
          + Nueva sucursal
        </Link>
      </div>

      {sinSucursales ? (
        <div className="text-center py-20 bg-slate-900 border border-slate-800 rounded-2xl">
          <p className="text-slate-400 text-lg mb-4">Todavía no tenés sucursales registradas</p>
          <Link
            href="/dashboard/sucursales/nueva"
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
          >
            Crear primera sucursal
          </Link>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Kpi label="Ventas hoy" value={formatPesos(data.totalHoyCentavos)} sub={`${data.cantidadHoy} venta${data.cantidadHoy !== 1 ? 's' : ''}`} accent="text-emerald-400" />
            <Kpi label="Ventas 30 días" value={formatPesos(data.totalMesCentavos)} sub={`${data.cantidadMes} ventas`} />
            <Kpi label="Ticket promedio" value={formatPesos(data.ticketPromedioCentavos)} />
            <Kpi label="Unidades vendidas" value={data.unidadesVendidas.toLocaleString('es-AR')} sub="últimos 30 días" />
            <Kpi label="Cajas abiertas" value={String(data.cajasAbiertas)} accent={data.cajasAbiertas > 0 ? 'text-blue-400' : 'text-slate-500'} />
          </div>

          {data.empty ? (
            <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
              <p className="text-slate-400">Todavía no hay ventas sincronizadas en este período.</p>
              <p className="text-slate-600 text-sm mt-1">Las estadísticas aparecerán cuando el desktop sincronice ventas.</p>
            </div>
          ) : (
            <>
              <ChartCard title="Ventas por día" subtitle="Monto facturado · últimos 30 días">
                <VentasPorDiaChart data={data.ventasPorDia} />
              </ChartCard>

              <div className="grid lg:grid-cols-2 gap-4">
                <ChartCard title="Medios de pago" subtitle="Distribución del monto">
                  <MediosPagoChart data={data.mediosPago} />
                </ChartCard>
                <ChartCard title="Ventas por hora" subtitle="Patrón horario del día">
                  <VentasPorHoraChart data={data.ventasPorHora} />
                </ChartCard>
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                <ChartCard title="Top productos" subtitle="Los 8 que más facturaron">
                  <TopProductosChart data={data.topProductos} />
                </ChartCard>
                <ChartCard title="Por categoría" subtitle="Facturación por rubro">
                  <CategoriaChart data={data.ventasPorCategoria} />
                </ChartCard>
              </div>

              {data.ventasPorSucursal.length > 1 && (
                <ChartCard title="Ventas por sucursal" subtitle="Comparativa · últimos 30 días">
                  <SucursalChart data={data.ventasPorSucursal} />
                </ChartCard>
              )}
            </>
          )}

          {/* Mis sucursales */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Mis sucursales</h2>
                <p className="text-slate-400 text-sm mt-0.5">{data.sucursales.length} sucursal{data.sucursales.length !== 1 ? 'es' : ''}</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              {data.sucursales.map(suc => (
                <Link
                  key={suc.id}
                  href={`/dashboard/sucursales/${suc.id}`}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 transition-colors block group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors">
                        {suc.nombre}
                      </h3>
                      {suc.ciudad && (
                        <p className="text-slate-500 text-sm mt-0.5">
                          {suc.ciudad}{suc.provincia ? `, ${suc.provincia}` : ''}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${suc.activo ? 'bg-emerald-900/40 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                      {suc.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <div className="border-t border-slate-800 pt-4 flex justify-between items-end">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Ventas hoy</p>
                      <p className="text-2xl font-bold text-white">{formatPesos(suc.totalHoyCentavos)}</p>
                    </div>
                    <p className="text-slate-500 text-sm">{suc.cajas} caja{suc.cajas !== 1 ? 's' : ''}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
