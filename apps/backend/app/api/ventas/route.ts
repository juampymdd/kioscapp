import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/src/db'
import { ventas, puntos_venta, sucursales } from '@/src/db/schema'
import { and, eq, inArray, gte, lte, desc } from 'drizzle-orm'
import { getSession } from '@/src/lib/session'

/** Puntos de venta del dueño con su sucursal (para scopear y nombrar). */
export async function pvDelUsuario(userId: string) {
  const db = getDb()
  return db.select({
    pvId: puntos_venta.id, pvNombre: puntos_venta.nombre,
    sucId: sucursales.id, sucNombre: sucursales.nombre,
  })
    .from(puntos_venta)
    .innerJoin(sucursales, eq(puntos_venta.sucursal_id, sucursales.id))
    .where(eq(sucursales.user_id, userId))
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const pvs = await pvDelUsuario(session.userId)
  const porPv = Object.fromEntries(pvs.map(p => [p.pvId, p]))
  const sucursalFiltro = req.nextUrl.searchParams.get('sucursal')
  const medio = req.nextUrl.searchParams.get('medio')
  const desde = req.nextUrl.searchParams.get('desde')
  const hasta = req.nextUrl.searchParams.get('hasta')

  const idsPermitidos = pvs
    .filter(p => !sucursalFiltro || p.sucId === sucursalFiltro)
    .map(p => p.pvId)
  if (idsPermitidos.length === 0) return NextResponse.json([])

  const db = getDb()
  const cond = [inArray(ventas.local_id, idsPermitidos)]
  if (medio) cond.push(eq(ventas.medio_pago, medio))
  if (desde) cond.push(gte(ventas.created_at, desde))
  if (hasta) cond.push(lte(ventas.created_at, hasta))

  const rows = await db.select().from(ventas).where(and(...cond))
    .orderBy(desc(ventas.created_at)).limit(500)

  return NextResponse.json(rows.map(v => ({
    ...v,
    sucursal_nombre: porPv[v.local_id]?.sucNombre ?? '—',
    caja_nombre: porPv[v.local_id]?.pvNombre ?? '—',
  })))
}
