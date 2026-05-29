import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/src/lib/session'
import { getDb } from '@/src/db'
import { sucursales, puntos_venta, ventas } from '@/src/db/schema'
import { and, eq, gte, sql } from 'drizzle-orm'
import EditarSucursalForm from './_components/EditarSucursalForm'
import NuevaCajaButton from './_components/NuevaCajaButton'

function formatPesos(centavos: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(centavos / 100)
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

  // Today's sales per caja
  const hoyInicio = `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`
  const totalesHoy = await db.select({
    local_id:       ventas.local_id,
    total_centavos: sql<number>`COALESCE(SUM(${ventas.total_centavos}), 0)`,
    cantidad:       sql<number>`COUNT(*)`,
  })
    .from(ventas)
    .where(and(
      gte(ventas.created_at, hoyInicio),
      eq(ventas.anulada, false),
    ))
    .groupBy(ventas.local_id)

  const statsMap = Object.fromEntries(totalesHoy.map(t => [t.local_id, t]))
  const totalHoySucursal = cajas.reduce((s, c) => s + (statsMap[c.id]?.total_centavos ?? 0), 0)

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 text-sm">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-300 transition-colors">Dashboard</Link>
        <span className="text-slate-700">/</span>
        <span className="text-slate-300">{suc.nombre}</span>
      </div>

      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">{suc.nombre}</h1>
          {suc.ciudad && <p className="text-slate-400 text-sm mt-1">{suc.ciudad}{suc.provincia ? `, ${suc.provincia}` : ''}</p>}
          {suc.direccion && <p className="text-slate-500 text-sm">{suc.direccion}</p>}
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${suc.activo ? 'bg-emerald-900/40 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
          {suc.activo ? 'Activa' : 'Inactiva'}
        </span>
      </div>

      {/* Stat hoy total */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-8 inline-block min-w-48">
        <p className="text-slate-400 text-xs mb-1">Ventas hoy (total sucursal)</p>
        <p className="text-3xl font-bold text-white">{formatPesos(totalHoySucursal)}</p>
      </div>

      {/* Cajas */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white">Cajas / Puntos de venta</h2>
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
                    <span className={`text-xs px-2 py-0.5 rounded-full ${caja.activo ? 'bg-emerald-900/40 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                      {caja.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-1">Ventas hoy</p>
                  <p className="text-xl font-bold text-white">{formatPesos(stats?.total_centavos ?? 0)}</p>
                  {stats && <p className="text-slate-500 text-xs mt-0.5">{stats.cantidad} transac.</p>}
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Edit sucursal */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="font-semibold text-white mb-5">Editar sucursal</h2>
        <EditarSucursalForm suc={{ id: suc.id, nombre: suc.nombre, direccion: suc.direccion, ciudad: suc.ciudad, provincia: suc.provincia }} />
      </div>
    </div>
  )
}
