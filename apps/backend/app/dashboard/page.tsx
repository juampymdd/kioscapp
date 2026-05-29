import Link from 'next/link'
import { getSession } from '@/src/lib/session'
import { getDb } from '@/src/db'
import { puntos_venta, ventas } from '@/src/db/schema'
import { and, eq, gte, sql } from 'drizzle-orm'

function formatPesos(centavos: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(centavos / 100)
}

export default async function DashboardPage() {
  const session = await getSession()
  const db = getDb()

  const pvList = await db.select().from(puntos_venta)
    .where(eq(puntos_venta.user_id, session.userId))

  // Fetch today's totals per PV in one query
  const hoy = new Date().toISOString().slice(0, 10)
  const hoyInicio = `${hoy}T00:00:00.000Z`
  const totalesHoy = await db.select({
    local_id:       ventas.local_id,
    total_centavos: sql<number>`COALESCE(SUM(${ventas.total_centavos}), 0)`,
    cantidad:       sql<number>`COUNT(*)`,
  })
    .from(ventas)
    .where(and(gte(ventas.created_at, hoyInicio), eq(ventas.anulada, false)))
    .groupBy(ventas.local_id)

  const totalesMap = Object.fromEntries(totalesHoy.map(t => [t.local_id, t]))

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Mis sucursales</h1>
          <p className="text-slate-400 text-sm mt-1">{pvList.length} punto{pvList.length !== 1 ? 's' : ''} de venta</p>
        </div>
        <Link
          href="/dashboard/puntos-venta/nueva"
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors"
        >
          + Nueva sucursal
        </Link>
      </div>

      {pvList.length === 0 ? (
        <div className="text-center py-20 bg-slate-900 border border-slate-800 rounded-2xl">
          <p className="text-slate-400 text-lg mb-4">Todavía no tenés sucursales registradas</p>
          <Link
            href="/dashboard/puntos-venta/nueva"
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
          >
            Crear primera sucursal
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {pvList.map(pv => {
            const stats = totalesMap[pv.id]
            return (
              <Link
                key={pv.id}
                href={`/dashboard/puntos-venta/${pv.id}`}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 transition-colors block group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors">
                      {pv.nombre}
                    </h2>
                    {pv.ciudad && (
                      <p className="text-slate-500 text-sm mt-0.5">{pv.ciudad}{pv.provincia ? `, ${pv.provincia}` : ''}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pv.activo ? 'bg-emerald-900/40 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                    {pv.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="border-t border-slate-800 pt-4">
                  <p className="text-xs text-slate-500 mb-1">Ventas hoy</p>
                  <p className="text-2xl font-bold text-white">
                    {stats ? formatPesos(stats.total_centavos) : '—'}
                  </p>
                  {stats && (
                    <p className="text-slate-500 text-xs mt-0.5">{stats.cantidad} transacción{stats.cantidad !== 1 ? 'es' : ''}</p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
