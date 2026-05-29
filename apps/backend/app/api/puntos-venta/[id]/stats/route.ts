import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/src/db'
import { ventas, puntos_venta } from '@/src/db/schema'
import { and, eq, gte, sql } from 'drizzle-orm'
import { getSession } from '@/src/lib/session'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const db = getDb()

  // Verify ownership
  const pvRows = await db.select({ id: puntos_venta.id })
    .from(puntos_venta)
    .where(and(eq(puntos_venta.id, id), eq(puntos_venta.user_id, session.userId)))
  if (!pvRows.length) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const hace30dias = new Date()
  hace30dias.setDate(hace30dias.getDate() - 30)
  const hoy = new Date().toISOString().slice(0, 10)

  // Daily breakdown for last 30 days
  const porDia = await db.select({
    fecha:           sql<string>`DATE(${ventas.created_at})`,
    cantidad:        sql<number>`COUNT(*)`,
    total_centavos:  sql<number>`SUM(${ventas.total_centavos})`,
  })
    .from(ventas)
    .where(and(
      eq(ventas.local_id, id),
      gte(ventas.created_at, hace30dias.toISOString()),
      eq(ventas.anulada, false),
    ))
    .groupBy(sql`DATE(${ventas.created_at})`)
    .orderBy(sql`DATE(${ventas.created_at}) DESC`)

  // Today's breakdown by payment method
  const hoyInicio = `${hoy}T00:00:00.000Z`
  const hoyFin    = `${hoy}T23:59:59.999Z`
  const porMedio = await db.select({
    medio_pago:     ventas.medio_pago,
    cantidad:       sql<number>`COUNT(*)`,
    total_centavos: sql<number>`SUM(${ventas.total_centavos})`,
  })
    .from(ventas)
    .where(and(
      eq(ventas.local_id, id),
      gte(ventas.created_at, hoyInicio),
      eq(ventas.anulada, false),
    ))
    .groupBy(ventas.medio_pago)

  const totalHoy  = porDia.find(d => d.fecha === hoy)?.total_centavos ?? 0
  const totalMes  = porDia.reduce((s, d) => s + (d.total_centavos ?? 0), 0)
  const diasConVentas = porDia.filter(d => (d.total_centavos ?? 0) > 0).length
  const promedioDiario = diasConVentas > 0 ? Math.round(totalMes / diasConVentas) : 0

  return NextResponse.json({
    total_hoy_centavos:      totalHoy,
    total_mes_centavos:      totalMes,
    promedio_diario_centavos: promedioDiario,
    por_dia:                 porDia,
    por_medio_hoy:           porMedio,
  })
}
