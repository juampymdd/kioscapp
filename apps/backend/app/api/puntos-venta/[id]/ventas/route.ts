import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/src/db'
import { puntos_venta, ventas, venta_items } from '@/src/db/schema'
import { and, eq, gte, inArray } from 'drizzle-orm'

async function checkSecret(pvId: string, secret: string): Promise<boolean> {
  const db = getDb()
  const rows = await db.select({ sync_secret: puntos_venta.sync_secret })
    .from(puntos_venta)
    .where(and(eq(puntos_venta.id, pvId), eq(puntos_venta.activo, true)))
  return rows.length > 0 && rows[0].sync_secret === secret
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const secret = req.headers.get('x-sync-secret') ?? ''

  if (!secret || !await checkSecret(id, secret)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const db = getDb()

  const desde = new Date()
  desde.setDate(desde.getDate() - 90)

  const ventaRows = await db.select()
    .from(ventas)
    .where(and(eq(ventas.local_id, id), gte(ventas.created_at, desde.toISOString())))
    .orderBy(ventas.created_at)
    .limit(500)

  const ventaIds = ventaRows.map(v => v.id)

  const itemRows = ventaIds.length > 0
    ? await db.select().from(venta_items).where(inArray(venta_items.venta_id, ventaIds))
    : []

  return NextResponse.json({ ventas: ventaRows, venta_items: itemRows })
}
