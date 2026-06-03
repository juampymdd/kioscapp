import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/src/db'
import { proveedores } from '@/src/db/schema'
import { isNull, eq } from 'drizzle-orm'
import { getSession } from '@/src/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const db = getDb()
  const rows = await db.select().from(proveedores).where(isNull(proveedores.deleted_at))
  rows.sort((a, b) => a.nombre.localeCompare(b.nombre))
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let b: { nombre?: string; telefono?: string | null; email?: string | null; notas?: string | null }
  try { b = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  if (!b.nombre?.trim()) return NextResponse.json({ error: 'nombre requerido' }, { status: 400 })

  const db = getDb()
  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  await db.insert(proveedores).values({
    id, local_id: 'central',
    nombre: b.nombre.trim(),
    telefono: b.telefono ?? null,
    email: b.email ?? null,
    notas: b.notas ?? null,
    activo: true,
    sync_status: 'synced',
    created_at: now,
    updated_at: now,
  })
  const row = await db.select().from(proveedores).where(eq(proveedores.id, id))
  return NextResponse.json(row[0], { status: 201 })
}
