import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/src/db'
import { compras, sucursales, proveedores } from '@/src/db/schema'
import { and, eq, isNull, desc } from 'drizzle-orm'
import { getSession } from '@/src/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const db = getDb()
  const rows = await db.select({
    c: compras, sucursal: sucursales.nombre, proveedor: proveedores.nombre,
  })
    .from(compras)
    .leftJoin(sucursales, eq(compras.sucursal_id, sucursales.id))
    .leftJoin(proveedores, eq(compras.proveedor_id, proveedores.id))
    .where(and(eq(compras.user_id, session.userId), isNull(compras.deleted_at)))
    .orderBy(desc(compras.fecha))
  return NextResponse.json(rows.map(r => ({ ...r.c, sucursal_nombre: r.sucursal, proveedor_nombre: r.proveedor })))
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let b: { sucursal_id?: string | null; proveedor_id?: string | null; fecha?: string; total_centavos?: number; notas?: string | null }
  try { b = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  if (typeof b.total_centavos !== 'number' || b.total_centavos < 0) return NextResponse.json({ error: 'total inválido' }, { status: 400 })

  const db = getDb()
  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  await db.insert(compras).values({
    id, local_id: 'central', user_id: session.userId,
    sucursal_id: b.sucursal_id || null,
    proveedor_id: b.proveedor_id || null,
    fecha: b.fecha || now.slice(0, 10),
    total_centavos: b.total_centavos,
    notas: b.notas ?? null,
    sync_status: 'synced', created_at: now, updated_at: now,
  })
  const row = await db.select().from(compras).where(eq(compras.id, id))
  return NextResponse.json(row[0], { status: 201 })
}
