/**
 * POST /api/sync/ingest
 * Recibe ventas, items, cajas, movimientos y proveedores del local.
 * Idempotente por UUID: ON CONFLICT DO NOTHING.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/src/db'
import { ventas, venta_items, cajas, movimientos_caja, proveedores } from '@/src/db/schema'

type IngestPayload = {
  local_id: string
  ventas?: (typeof ventas.$inferInsert)[]
  venta_items?: (typeof venta_items.$inferInsert)[]
  cajas?: (typeof cajas.$inferInsert)[]
  movimientos_caja?: (typeof movimientos_caja.$inferInsert)[]
  proveedores?: (typeof proveedores.$inferInsert)[]
}

function checkAuth(req: NextRequest): boolean {
  const secret = process.env.SYNC_SECRET
  if (!secret) return true // sin secret configurado, permitir (dev)
  return req.headers.get('x-sync-secret') === secret
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let body: IngestPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!body.local_id) {
    return NextResponse.json({ error: 'local_id requerido' }, { status: 400 })
  }

  const ingested: Record<string, number> = {}

  try {
    if (body.cajas?.length) {
      await db
        .insert(cajas)
        .values(body.cajas.map(c => ({ ...c, sync_status: 'synced' as const })))
        .onConflictDoNothing()
      ingested.cajas = body.cajas.length
    }

    if (body.ventas?.length) {
      await db
        .insert(ventas)
        .values(body.ventas.map(v => ({ ...v, sync_status: 'synced' as const })))
        .onConflictDoNothing()
      ingested.ventas = body.ventas.length
    }

    if (body.venta_items?.length) {
      await db
        .insert(venta_items)
        .values(body.venta_items.map(i => ({ ...i, sync_status: 'synced' as const })))
        .onConflictDoNothing()
      ingested.venta_items = body.venta_items.length
    }

    if (body.movimientos_caja?.length) {
      await db
        .insert(movimientos_caja)
        .values(body.movimientos_caja.map(m => ({ ...m, sync_status: 'synced' as const })))
        .onConflictDoNothing()
      ingested.movimientos_caja = body.movimientos_caja.length
    }

    if (body.proveedores?.length) {
      await db
        .insert(proveedores)
        .values(body.proveedores.map(p => ({ ...p, sync_status: 'synced' as const })))
        .onConflictDoNothing()
      ingested.proveedores = body.proveedores.length
    }

    return NextResponse.json({ ok: true, ingested })
  } catch (err) {
    console.error('[sync/ingest]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
