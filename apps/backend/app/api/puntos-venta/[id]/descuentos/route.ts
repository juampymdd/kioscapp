import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/src/db'
import { puntos_venta, sucursales, descuentos } from '@/src/db/schema'
import { and, eq, isNull, or } from 'drizzle-orm'
import { optionsResponse, withCors } from '@/src/lib/cors'

async function resolverPV(pvId: string, secret: string) {
  const db = getDb()
  const rows = await db
    .select({ sync_secret: puntos_venta.sync_secret, user_id: sucursales.user_id, sucursal_id: sucursales.id })
    .from(puntos_venta)
    .innerJoin(sucursales, eq(puntos_venta.sucursal_id, sucursales.id))
    .where(and(eq(puntos_venta.id, pvId), eq(puntos_venta.activo, true)))
  if (rows.length === 0 || rows[0].sync_secret !== secret) return null
  return { userId: rows[0].user_id, sucursalId: rows[0].sucursal_id }
}

export function OPTIONS() { return optionsResponse() }

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const secret = req.headers.get('x-sync-secret') ?? ''
  const pv = secret ? await resolverPV(id, secret) : null
  if (!pv) return withCors(NextResponse.json({ error: 'No autorizado' }, { status: 401 }))

  const db = getDb()
  const rows = await db.select().from(descuentos).where(
    and(
      eq(descuentos.user_id, pv.userId),
      eq(descuentos.activo, true),
      isNull(descuentos.deleted_at),
      or(isNull(descuentos.sucursal_id), eq(descuentos.sucursal_id, pv.sucursalId)),
    ),
  )
  return withCors(NextResponse.json({ descuentos: rows }))
}
