import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/src/db'
import { ventas, venta_items, cajas, movimientos_caja, proveedores, puntos_venta } from '@/src/db/schema'
import { optionsResponse, withCors } from '@/src/lib/cors'
import { and, eq } from 'drizzle-orm'

type IngestPayload = {
  local_id: string
  ventas?: (typeof ventas.$inferInsert)[]
  venta_items?: (typeof venta_items.$inferInsert)[]
  cajas?: (typeof cajas.$inferInsert)[]
  movimientos_caja?: (typeof movimientos_caja.$inferInsert)[]
  proveedores?: (typeof proveedores.$inferInsert)[]
}

async function checkAuth(req: NextRequest, localId: string): Promise<boolean> {
  const secret = req.headers.get('x-sync-secret')
  if (!secret) return false

  // Backward-compat: accept env var secret (for development / migration)
  const envSecret = process.env.SYNC_SECRET
  if (envSecret && secret === envSecret) return true

  // Primary: validate against registered punto de venta
  if (!localId) return false
  const db = getDb()
  const rows = await db.select({ sync_secret: puntos_venta.sync_secret })
    .from(puntos_venta)
    .where(and(eq(puntos_venta.id, localId), eq(puntos_venta.activo, true)))
  return rows.length > 0 && rows[0].sync_secret === secret
}

export function OPTIONS() { return optionsResponse() }

export async function POST(req: NextRequest) {
  let body: IngestPayload
  try {
    body = await req.json()
  } catch {
    return withCors(NextResponse.json({ error: 'JSON inválido' }, { status: 400 }))
  }

  if (!body.local_id) {
    return withCors(NextResponse.json({ error: 'local_id requerido' }, { status: 400 }))
  }

  if (!await checkAuth(req, body.local_id)) {
    return withCors(NextResponse.json({ error: 'No autorizado' }, { status: 401 }))
  }

  const db = getDb()
  const ingested: Record<string, number> = {}

  try {
    if (body.cajas?.length) {
      await db.insert(cajas)
        .values(body.cajas.map(c => ({ ...c, sync_status: 'synced' as const })))
        .onConflictDoNothing()
      ingested.cajas = body.cajas.length
    }

    if (body.ventas?.length) {
      await db.insert(ventas)
        .values(body.ventas.map(v => ({ ...v, sync_status: 'synced' as const })))
        .onConflictDoNothing()
      ingested.ventas = body.ventas.length
    }

    if (body.venta_items?.length) {
      await db.insert(venta_items)
        .values(body.venta_items.map(i => ({ ...i, sync_status: 'synced' as const })))
        .onConflictDoNothing()
      ingested.venta_items = body.venta_items.length
    }

    if (body.movimientos_caja?.length) {
      await db.insert(movimientos_caja)
        .values(body.movimientos_caja.map(m => ({ ...m, sync_status: 'synced' as const })))
        .onConflictDoNothing()
      ingested.movimientos_caja = body.movimientos_caja.length
    }

    if (body.proveedores?.length) {
      await db.insert(proveedores)
        .values(body.proveedores.map(p => ({ ...p, sync_status: 'synced' as const })))
        .onConflictDoNothing()
      ingested.proveedores = body.proveedores.length
    }

    return withCors(NextResponse.json({ ok: true, ingested }))
  } catch (err) {
    console.error('[sync/ingest]', err)
    return withCors(NextResponse.json({ error: 'Error interno' }, { status: 500 }))
  }
}
