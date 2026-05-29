import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/src/db'
import { ventas, puntos_venta, sucursales } from '@/src/db/schema'
import { and, eq, gte, sql } from 'drizzle-orm'
import { getSession } from '@/src/lib/session'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const db = getDb()

  // Verify ownership through sucursal
  const owned = await db.select({ pvId: puntos_venta.id })
    .from(puntos_venta)
    .innerJoin(sucursales, eq(puntos_venta.sucursal_id, sucursales.id))
    .where(and(eq(puntos_venta.id, id), eq(sucursales.user_id, session.userId)))
  if (!owned.length) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

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

  const totalHoy  = porDia.find(d => d.fecha === hoy)?.total_centavos ?? 0
  const totalMes  = porDia.reduce((s, d) => s + (d.total_centavos ?? 0), 0)
  const dias      = porDia.filter(d => (d.total_centavos ?? 0) > 0).length
  const promedio  = dias > 0 ? Math.round(totalMes / dias) : 0

  return NextResponse.json({ total_hoy_centavos: totalHoy, total_mes_centavos: totalMes, promedio_diario_centavos: promedio, por_dia: porDia, por_medio_hoy: porMedioHoy })
}
