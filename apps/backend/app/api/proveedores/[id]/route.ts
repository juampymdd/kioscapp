import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/src/db'
import { proveedores } from '@/src/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/src/lib/session'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { id } = await params

  let b: { nombre?: string; telefono?: string | null; email?: string | null; notas?: string | null; activo?: boolean }
  try { b = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof b.nombre === 'string' && b.nombre.trim()) patch.nombre = b.nombre.trim()
  if (b.telefono !== undefined) patch.telefono = b.telefono || null
  if (b.email !== undefined) patch.email = b.email || null
  if (b.notas !== undefined) patch.notas = b.notas || null
  if (typeof b.activo === 'boolean') patch.activo = b.activo

  const db = getDb()
  await db.update(proveedores).set(patch).where(eq(proveedores.id, id))
  const row = await db.select().from(proveedores).where(eq(proveedores.id, id))
  return NextResponse.json(row[0] ?? null)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { id } = await params

  const db = getDb()
  await db.update(proveedores)
    .set({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .where(eq(proveedores.id, id))
  return NextResponse.json({ ok: true })
}
