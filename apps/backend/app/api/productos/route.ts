import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/src/db'
import { productos, stock } from '@/src/db/schema'
import { eq, isNull } from 'drizzle-orm'
import { getSession } from '@/src/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const db = getDb()
  const prods = await db.select().from(productos).where(isNull(productos.deleted_at))
  const stocks = await db.select().from(stock).where(isNull(stock.deleted_at))
  const stockBy = Object.fromEntries(stocks.map(s => [s.producto_id, s]))
  const rows = prods.map(p => ({ ...p, cantidad: Number(stockBy[p.id]?.cantidad ?? 0) }))
  rows.sort((a, b) => a.descripcion.localeCompare(b.descripcion))
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let b: {
    descripcion?: string; categoria?: string; precio_centavos?: number
    codigo_barras?: string | null; fraccionable?: boolean; precio_variable?: boolean
    unidad_medida?: string; cantidad?: number
  }
  try { b = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  if (!b.descripcion?.trim()) return NextResponse.json({ error: 'descripcion requerida' }, { status: 400 })

  const db = getDb()
  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  const fracc = b.fraccionable ?? false
  await db.insert(productos).values({
    id,
    local_id: 'central',
    codigo_barras: b.codigo_barras ?? null,
    descripcion: b.descripcion.trim(),
    categoria: b.categoria ?? 'varios',
    precio_centavos: b.precio_centavos ?? 0,
    fraccionable: fracc,
    precio_variable: b.precio_variable ?? false,
    unidad_medida: b.unidad_medida ?? (fracc ? 'kg' : 'unidad'),
    activo: true,
    sync_status: 'synced',
    created_at: now,
    updated_at: now,
  })
  await db.insert(stock).values({
    id: crypto.randomUUID(),
    local_id: 'central',
    producto_id: id,
    cantidad: b.cantidad ?? 0,
    alerta_minimo: 5,
    sync_status: 'synced',
    created_at: now,
    updated_at: now,
  })

  const row = await db.select().from(productos).where(eq(productos.id, id))
  return NextResponse.json(row[0], { status: 201 })
}
