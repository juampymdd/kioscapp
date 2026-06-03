import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/src/db'
import { productos, stock } from '@/src/db/schema'
import { and, eq } from 'drizzle-orm'
import { getSession } from '@/src/lib/session'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { id } = await params

  let b: {
    descripcion?: string; categoria?: string; precio_centavos?: number
    codigo_barras?: string | null; fraccionable?: boolean; precio_variable?: boolean
    unidad_medida?: string; activo?: boolean; cantidad?: number
  }
  try { b = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const now = new Date().toISOString()
  const patch: Record<string, unknown> = { updated_at: now }
  if (typeof b.descripcion === 'string' && b.descripcion.trim()) patch.descripcion = b.descripcion.trim()
  if (typeof b.categoria === 'string') patch.categoria = b.categoria
  if (typeof b.precio_centavos === 'number') patch.precio_centavos = b.precio_centavos
  if (b.codigo_barras !== undefined) patch.codigo_barras = b.codigo_barras || null
  if (typeof b.fraccionable === 'boolean') patch.fraccionable = b.fraccionable
  if (typeof b.precio_variable === 'boolean') patch.precio_variable = b.precio_variable
  if (typeof b.unidad_medida === 'string') patch.unidad_medida = b.unidad_medida
  if (typeof b.activo === 'boolean') patch.activo = b.activo

  const db = getDb()
  await db.update(productos).set(patch).where(eq(productos.id, id))

  if (typeof b.cantidad === 'number') {
    const existing = await db.select().from(stock).where(eq(stock.producto_id, id))
    if (existing.length) {
      await db.update(stock).set({ cantidad: b.cantidad, updated_at: now }).where(eq(stock.producto_id, id))
    } else {
      await db.insert(stock).values({
        id: crypto.randomUUID(), local_id: 'central', producto_id: id,
        cantidad: b.cantidad, alerta_minimo: 5, sync_status: 'synced', created_at: now, updated_at: now,
      })
    }
  }

  const row = await db.select().from(productos).where(eq(productos.id, id))
  return NextResponse.json(row[0] ?? null)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { id } = await params

  const db = getDb()
  await db.update(productos)
    .set({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString(), activo: false })
    .where(and(eq(productos.id, id)))
  return NextResponse.json({ ok: true })
}
