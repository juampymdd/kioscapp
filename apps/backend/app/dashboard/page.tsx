import Link from 'next/link'
import { getSession } from '@/src/lib/session'
import { getDb } from '@/src/db'
import { sucursales, puntos_venta, ventas } from '@/src/db/schema'
import { and, eq, gte, sql } from 'drizzle-orm'

function formatPesos(centavos: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(centavos / 100)
}

export default async function DashboardPage() {
  const session = await getSession()
  const db = getDb()

  const sucList = await db.select().from(sucursales).where(eq(sucursales.user_id, session.userId))

  // Count active POS per sucursal
  const pvCounts = await db.select({
    sucursal_id: puntos_venta.sucursal_id,
    cantidad:    sql<number>`COUNT(*)`,
  })
    .from(puntos_venta)
    .where(eq(puntos_venta.activo, true))
    .groupBy(puntos_venta.sucursal_id)

  const pvCountMap = Object.fromEntries(pvCounts.map(r => [r.sucursal_id, r.cantidad]))

  // Today's totals per sucursal (aggregate all POS in that branch)
  const hoyInicio = `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`
  const pvIds = await db.select({ id: puntos_venta.id, sucursal_id: puntos_venta.sucursal_id })
    .from(puntos_venta)
    .innerJoin(sucursales, eq(puntos_venta.sucursal_id, sucursales.id))
    .where(eq(sucursales.user_id, session.userId))

  const totalesHoy = await db.select({
    local_id:       ventas.local_id,
    total_centavos: sql<number>`COALESCE(SUM(${ventas.total_centavos}), 0)`,
  })
    .from(ventas)
    .where(and(gte(ventas.created_at, hoyInicio), eq(ventas.anulada, false)))
    .groupBy(ventas.local_id)

  const totalPorPv = Object.fromEntries(totalesHoy.map(t => [t.local_id, t.total_centavos]))

  // Aggregate totals per sucursal
  const totalPorSucursal: Record<string, number> = {}
  for (const pv of pvIds) {
    totalPorSucursal[pv.sucursal_id] = (totalPorSucursal[pv.sucursal_id] ?? 0) + (totalPorPv[pv.id] ?? 0)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Mis sucursales</h1>
          <p className="text-slate-400 text-sm mt-1">{sucList.length} sucursal{sucList.length !== 1 ? 'es' : ''}</p>
        </div>
        <Link
          href="/dashboard/sucursales/nueva"
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors"
        >
          + Nueva sucursal
        </Link>
      </div>

      {sucList.length === 0 ? (
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
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {sucList.map(suc => {
            const cajas = pvCountMap[suc.id] ?? 0
            const totalHoy = totalPorSucursal[suc.id] ?? 0
            return (
              <Link
                key={suc.id}
                href={`/dashboard/sucursales/${suc.id}`}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 transition-colors block group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors">
                      {suc.nombre}
                    </h2>
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
                    <p className="text-2xl font-bold text-white">{formatPesos(totalHoy)}</p>
                  </div>
                  <p className="text-slate-500 text-sm">{cajas} caja{cajas !== 1 ? 's' : ''}</p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
