import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Store, Monitor } from 'lucide-react'
import { getSession } from '@/src/lib/session'
import { getDb } from '@/src/db'
import { sucursales, puntos_venta, ventas } from '@/src/db/schema'
import { and, eq, gte, inArray, sql } from 'drizzle-orm'
import EditarSucursalForm from './_components/EditarSucursalForm'
import NuevaCajaButton from './_components/NuevaCajaButton'
import PageHeader from '../../_components/PageHeader'
import DashboardTabs from '../../_components/DashboardTabs'

function formatPesos(centavos: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(centavos / 100)
}

function formatFechaHora(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

const MEDIO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo', debito: 'Débito', credito: 'Crédito',
  qr_mercado_pago: 'QR / MP', cuenta_corriente: 'Cta. cte.',
}

export default async function DetalleSucursalPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) redirect('/auth/login')

  const { id } = await params
  const db = getDb()

  const sucRows = await db.select().from(sucursales)
    .where(and(eq(sucursales.id, id), eq(sucursales.user_id, session.userId)))
  if (!sucRows.length) notFound()
  const suc = sucRows[0]

  // POS terminals in this branch
  const cajas = await db.select().from(puntos_venta).where(eq(puntos_venta.sucursal_id, id))
  const cajaIds = cajas.map(c => c.id)
  const cajaNombre = Object.fromEntries(cajas.map(c => [c.id, c.nombre]))

  // Today's sales per caja (scoped to this branch)
  const hoyInicio = `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`
  const totalesHoy = cajaIds.length
    ? await db.select({
        local_id:       ventas.local_id,
        total_centavos: sql<number>`COALESCE(SUM(${ventas.total_centavos}), 0)`,
        cantidad:       sql<number>`COUNT(*)`,
      })
        .from(ventas)
        .where(and(inArray(ventas.local_id, cajaIds), gte(ventas.created_at, hoyInicio), eq(ventas.anulada, false)))
        .groupBy(ventas.local_id)
    : []

  const statsMap = Object.fromEntries(totalesHoy.map(t => [t.local_id, t]))
  const totalHoySucursal = cajas.reduce((s, c) => s + Number(statsMap[c.id]?.total_centavos ?? 0), 0)

  // Recent sales across all cajas of the branch
  const ventasRecientes = cajaIds.length
    ? await db.select().from(ventas)
        .where(inArray(ventas.local_id, cajaIds))
        .orderBy(sql`${ventas.created_at} DESC`)
        .limit(50)
    : []

  return (
    <div>
      <PageHeader
        Icon={Store}
        title={suc.nombre}
        subtitle={[suc.ciudad, suc.provincia].filter(Boolean).join(', ') || suc.direccion || undefined}
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: suc.nombre }]}
        actions={
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${suc.activo ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
            {suc.activo ? 'Activa' : 'Inactiva'}
          </span>
        }
      />

      {/* KPIs (overview) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Ventas hoy</p>
          <p className="text-2xl font-bold mt-1.5 text-emerald-400">{formatPesos(totalHoySucursal)}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Cajas</p>
          <p className="text-2xl font-bold mt-1.5 text-white">{cajas.length}</p>
        </div>
        {suc.direccion && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 col-span-2 lg:col-span-1">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Dirección</p>
            <p className="text-sm font-medium mt-1.5 text-slate-300">{suc.direccion}</p>
          </div>
        )}
      </div>

      <DashboardTabs
        tabs={[
          {
            id: 'cajas',
            label: `Cajas · ${cajas.length}`,
            panel: (
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Monitor size={18} className="text-blue-400" /> Puntos de venta
                  </h2>
                  <NuevaCajaButton sucursalId={id} />
                </div>

                {cajas.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
                    <p className="text-slate-400 mb-4">No hay cajas registradas en esta sucursal</p>
                    <NuevaCajaButton sucursalId={id} variant="primary" />
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {cajas.map(caja => {
                      const stats = statsMap[caja.id]
                      return (
                        <Link
                          key={caja.id}
                          href={`/dashboard/puntos-venta/${caja.id}`}
                          className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 block group transition-colors"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                              {caja.nombre}
                            </h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${caja.activo ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                              {caja.activo ? 'Activa' : 'Inactiva'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mb-1">Ventas hoy</p>
                          <p className="text-xl font-bold text-white">{formatPesos(Number(stats?.total_centavos ?? 0))}</p>
                          {stats && <p className="text-slate-500 text-xs mt-0.5">{stats.cantidad} transac.</p>}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </section>
            ),
          },
          {
            id: 'ventas',
            label: 'Ventas',
            panel: (
              <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-800">
                  <h2 className="text-lg font-semibold text-white">Ventas de todas las cajas</h2>
                  <p className="text-slate-500 text-sm mt-0.5">Últimas {ventasRecientes.length} ventas de la sucursal</p>
                </div>
                {ventasRecientes.length === 0 ? (
                  <p className="text-slate-400 text-center py-16">Todavía no hay ventas en esta sucursal.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-900 text-slate-500 text-xs uppercase tracking-wide">
                        <tr className="border-b border-slate-800 text-left">
                          <th className="px-5 py-2.5 font-medium">Fecha</th>
                          <th className="px-5 py-2.5 font-medium">Caja</th>
                          <th className="px-5 py-2.5 font-medium">Medio</th>
                          <th className="px-5 py-2.5 font-medium text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {ventasRecientes.map(v => (
                          <tr key={v.id} className={v.anulada ? 'opacity-50' : ''}>
                            <td className="px-5 py-3 text-slate-300 whitespace-nowrap">
                              {formatFechaHora(v.created_at)}
                              {v.anulada && <span className="ml-2 text-[10px] bg-red-500/15 text-red-300 px-1.5 py-0.5 rounded">Anulada</span>}
                            </td>
                            <td className="px-5 py-3 text-slate-400">{cajaNombre[v.local_id] ?? '—'}</td>
                            <td className="px-5 py-3 text-slate-400">{MEDIO_LABEL[v.medio_pago] ?? v.medio_pago}</td>
                            <td className="px-5 py-3 text-right text-white font-medium tabular-nums">{formatPesos(v.total_centavos)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ),
          },
          {
            id: 'editar',
            label: 'Editar',
            panel: (
              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl">
                <h2 className="font-semibold text-white mb-5">Editar sucursal</h2>
                <EditarSucursalForm suc={{ id: suc.id, nombre: suc.nombre, direccion: suc.direccion, ciudad: suc.ciudad, provincia: suc.provincia }} />
              </section>
            ),
          },
        ]}
      />
    </div>
  )
}
