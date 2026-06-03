import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/src/db'
import { precios_sucursal } from '@/src/db/schema'
import { and, eq } from 'drizzle-orm'
import { getSession } from '@/src/lib/session'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  const rows = await db.select().from(precios_sucursal).where(eq(precios_sucursal.producto_id, id))
  return NextResponse.json(rows.map(r => ({ sucursal_id: r.sucursal_id, precio_centavos: r.precio_centavos })))
}

// body: { overrides: { sucursal_id: string; precio_centavos: number | null }[] }
// precio_centavos null/<=0 → quita el override (usa el precio base).
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { id } = await params

  let b: { overrides?: { sucursal_id: string; precio_centavos: number | null }[] }
  try { b = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  const overrides = b.overrides ?? []

  const db = getDb()
  const now = new Date().toISOString()
  for (const o of overrides) {
    if (!o.sucursal_id) continue
    if (o.precio_centavos == null || o.precio_centavos <= 0) {
      await db.delete(precios_sucursal)
        .where(and(eq(precios_sucursal.producto_id, id), eq(precios_sucursal.sucursal_id, o.sucursal_id)))
      continue
    }
    const ex = await db.select().from(precios_sucursal)
      .where(and(eq(precios_sucursal.producto_id, id), eq(precios_sucursal.sucursal_id, o.sucursal_id)))
    if (ex.length) {
      await db.update(precios_sucursal).set({ precio_centavos: o.precio_centavos, updated_at: now })
        .where(eq(precios_sucursal.id, ex[0].id))
    } else {
      await db.insert(precios_sucursal).values({
        id: crypto.randomUUID(), local_id: 'central',
        sucursal_id: o.sucursal_id, producto_id: id, precio_centavos: o.precio_centavos,
        sync_status: 'synced', created_at: now, updated_at: now,
      })
    }
  }
  return NextResponse.json({ ok: true })
}
