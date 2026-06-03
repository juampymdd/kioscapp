import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/src/db'
import { puntos_venta, sucursales, precios_sucursal } from '@/src/db/schema'
import { and, eq } from 'drizzle-orm'
import { optionsResponse, withCors } from '@/src/lib/cors'

export function OPTIONS() { return optionsResponse() }

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const secret = req.headers.get('x-sync-secret') ?? ''
  if (!secret) return withCors(NextResponse.json({ error: 'No autorizado' }, { status: 401 }))

  const db = getDb()
  const rows = await db
    .select({ sync_secret: puntos_venta.sync_secret, sucursal_id: sucursales.id })
    .from(puntos_venta)
    .innerJoin(sucursales, eq(puntos_venta.sucursal_id, sucursales.id))
    .where(and(eq(puntos_venta.id, id), eq(puntos_venta.activo, true)))
  if (rows.length === 0 || rows[0].sync_secret !== secret) {
    return withCors(NextResponse.json({ error: 'No autorizado' }, { status: 401 }))
  }

  const precios = await db.select({ producto_id: precios_sucursal.producto_id, precio_centavos: precios_sucursal.precio_centavos })
    .from(precios_sucursal).where(eq(precios_sucursal.sucursal_id, rows[0].sucursal_id))
  return withCors(NextResponse.json({ precios }))
}
