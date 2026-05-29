import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/src/lib/session'
import { getDb } from '@/src/db'
import { puntos_venta, sucursales, ventas } from '@/src/db/schema'
import { and, eq, gte, sql } from 'drizzle-orm'
import RegenerarSecretButton from './_components/RegenerarSecretButton'
import EditarCajaForm from './_components/EditarCajaForm'

function formatPesos(centavos: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(centavos / 100)
}

export default async function DetalleCajaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) redirect('/auth/login')

  const { id } = await params
  const db = getDb()

  const rows = await db.select({ pv: puntos_venta, suc: sucursales })
    .from(puntos_venta)
    .innerJoin(sucursales, eq(puntos_venta.sucursal_id, sucursales.id))
    .where(and(eq(puntos_venta.id, id), eq(sucursales.user_id, session.userId)))
  if (!rows.length) notFound()
  const { pv, suc } = rows[0]

  // Stats: last 30 days
  const hace30 = new Date()
  hace30.setDate(hace30.getDate() - 30)
  const hoy = new Date().toISOString().slice(0, 10)

  const porDia = await db.select({
    fecha:          sql<string>`DATE(${ventas.created_at})`,
    cantidad:       sql<number>`COUNT(*)`,
    total_centavos: sql<number>`SUM(${ventas.total_centavos})`,
  })
    .from(ventas)
    .where(and(eq(ventas.local_id, id), gte(ventas.created_at, hace30.toISOString()), eq(ventas.anulada, false)))
    .groupBy(sql`DATE(${ventas.created_at})`)
    .orderBy(sql`DATE(${ventas.created_at}) DESC`)

  const porMedioHoy = await db.select({
    medio_pago:     ventas.medio_pago,
    cantidad:       sql<number>`COUNT(*)`,
    total_centavos: sql<number>`SUM(${ventas.total_centavos})`,
  })
    .from(ventas)
    .where(and(eq(ventas.local_id, id), gte(ventas.created_at, `${hoy}T00:00:00.000Z`), eq(ventas.anulada, false)))
    .groupBy(ventas.medio_pago)

  const ultimasVentas = await db.select()
    .from(ventas)
    .where(and(eq(ventas.local_id, id), eq(ventas.anulada, false)))
    .orderBy(sql`${ventas.created_at} DESC`)
    .limit(10)

  const totalHoy  = porDia.find(d => d.fecha === hoy)?.total_centavos ?? 0
  const totalMes  = porDia.reduce((s, d) => s + (d.total_centavos ?? 0), 0)
  const diasConVentas = porDia.filter(d => (d.total_centavos ?? 0) > 0).length
  const promedioDiario = diasConVentas > 0 ? Math.round(totalMes / diasConVentas) : 0
  const maxDia = Math.max(...porDia.map(d => d.total_centavos ?? 0), 1)

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6 text-sm">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-300 transition-colors">Dashboard</Link>
        <span className="text-slate-700">/</span>
        <Link href={`/dashboard/sucursales/${suc.id}`} className="text-slate-500 hover:text-slate-300 transition-colors">{suc.nombre}</Link>
        <span className="text-slate-700">/</span>
        <span className="text-slate-300">{pv.nombre}</span>
      </div>

      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">{pv.nombre}</h1>
          <p className="text-slate-400 text-sm mt-1">{suc.nombre}{suc.ciudad ? ` · ${suc.ciudad}` : ''}</p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${pv.activo ? 'bg-emerald-900/40 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
          {pv.activo ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      {/* Stats cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Ventas hoy', value: formatPesos(totalHoy) },
          { label: 'Total últimos 30 días', value: formatPesos(totalMes) },
          { label: 'Promedio diario', value: formatPesos(promedioDiario) },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <p className="text-slate-400 text-xs mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-2 gap-6 mb-8">
        {/* Bar chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-5">Últimos 14 días</h2>
          {porDia.length === 0 ? (
            <p className="text-slate-500 text-sm py-8 text-center">Sin ventas aún</p>
          ) : (
            <div className="space-y-2">
              {porDia.slice(0, 14).reverse().map(d => (
                <div key={d.fecha} className="flex items-center gap-3 text-sm">
                  <span className="text-slate-500 w-20 shrink-0 text-xs">
                    {new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                  </span>
                  <div className="flex-1 bg-slate-800 rounded-full h-5 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${Math.round(((d.total_centavos ?? 0) / maxDia) * 100)}%` }}
                    />
                  </div>
                  <span className="text-slate-300 w-28 text-right text-xs shrink-0">{formatPesos(d.total_centavos ?? 0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today breakdown by payment method */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-5">Hoy por medio de pago</h2>
          {porMedioHoy.length === 0 ? (
            <p className="text-slate-500 text-sm py-8 text-center">Sin ventas hoy</p>
          ) : (
            <div className="space-y-3">
              {porMedioHoy.map(m => (
                <div key={m.medio_pago} className="flex justify-between items-center">
                  <span className="text-slate-300 text-sm capitalize">{m.medio_pago.replace('_', ' ')}</span>
                  <div className="text-right">
                    <p className="text-white font-semibold text-sm">{formatPesos(m.total_centavos ?? 0)}</p>
                    <p className="text-slate-500 text-xs">{m.cantidad} transac.</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent sales table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
        <h2 className="font-semibold text-white mb-5">Últimas ventas</h2>
        {ultimasVentas.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">Sin ventas registradas</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left">
                  <th className="text-slate-500 font-medium pb-3 pr-4">Fecha</th>
                  <th className="text-slate-500 font-medium pb-3 pr-4">Medio</th>
                  <th className="text-slate-500 font-medium pb-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {ultimasVentas.map(v => (
                  <tr key={v.id}>
                    <td className="py-3 pr-4 text-slate-400">
                      {new Date(v.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 pr-4 text-slate-300 capitalize">{v.medio_pago.replace('_', ' ')}</td>
                    <td className="py-3 text-right text-white font-medium">{formatPesos(v.total_centavos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Credentials */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
        <h2 className="font-semibold text-white mb-5">Credenciales de sincronización</h2>
        <div className="space-y-4 max-w-lg">
          <div>
            <p className="text-slate-400 text-xs mb-2 font-medium uppercase tracking-wider">Local ID</p>
            <code className="block bg-slate-800 text-blue-300 px-4 py-3 rounded-xl text-sm font-mono break-all">
              {pv.id}
            </code>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-2 font-medium uppercase tracking-wider">Sync Secret</p>
            <p className="text-slate-500 text-sm mb-3">El secret no se muestra por seguridad. Podés regenerarlo si lo necesitás.</p>
            <RegenerarSecretButton pvId={pv.id} />
          </div>
        </div>
      </div>

      {/* Edit caja */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="font-semibold text-white mb-5">Editar caja</h2>
        <EditarCajaForm pv={{ id: pv.id, nombre: pv.nombre }} />
      </div>
    </div>
  )
}
