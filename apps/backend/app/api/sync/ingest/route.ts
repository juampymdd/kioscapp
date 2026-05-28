/**
 * POST /api/sync/ingest
 * Recibe ventas, items, cajas y movimientos del local.
 * Idempotente por UUID: ON CONFLICT DO NOTHING.
 * Tolerante al orden: venta_items puede llegar antes que su caja.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/src/db'
import { ventas, venta_items, cajas, movimientos_caja } from '@/src/db/schema'
import { sql } from 'drizzle-orm'

interface IngestPayload {
  local_id: string
  ventas?: typeof ventas.$inferInsert[]
  venta_items?: typeof venta_items.$inferInsert[]
  cajas?: typeof cajas.$inferInsert[]
  movimientos_caja?: typeof movimientos_caja.$inferInsert[]
}

export async function POST(req: NextRequest) {
  let body: IngestPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!body.local_id) {
    return NextResponse.json({ error: 'local_id requerido' }, { status: 400 })
  }

  const results: Record<string, number> = {}

  try {
    // Cajas primero (las ventas las referencian)
    if (body.cajas?.length) {
      await db
        .insert(cajas)
        .values(body.cajas.map(c => ({ ...c, sync_status: 'synced' as const })))
        .onConflictDoNothing()
      results.cajas = body.cajas.length
    }

    // Ventas
    if (body.ventas?.length) {
      await db
        .insert(ventas)
        .values(body.ventas.map(v => ({ ...v, sync_status: 'synced' as const })))
        .onConflictDoNothing()
      results.ventas = body.ventas.length
    }

    // Items (con DEFERRABLE en la FK, toleramos que lleguen antes que su venta)
    if (body.venta_items?.length) {
      await db
        .insert(venta_items)
        .values(body.venta_items.map(i => ({ ...i, sync_status: 'synced' as const })))
        .onConflictDoNothing()
      results.venta_items = body.venta_items.length
    }

    if (body.movimientos_caja?.length) {
      await db
        .insert(movimientos_caja)
        .values(body.movimientos_caja.map(m => ({ ...m, sync_status: 'synced' as const })))
        .onConflictDoNothing()
      results.movimientos_caja = body.movimientos_caja.length
    }

    return NextResponse.json({ ok: true, ingested: results })
  } catch (err) {
    console.error('[ingest]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
