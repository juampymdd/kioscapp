import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/src/db'
import { categorias } from '@/src/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/src/lib/session'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { id } = await params

  let body: { nombre?: string; icono?: string; color?: string | null; orden?: number; activo?: boolean }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.nombre === 'string' && body.nombre.trim()) patch.nombre = body.nombre.trim()
  if (typeof body.icono === 'string') patch.icono = body.icono
  if (body.color !== undefined) patch.color = body.color
  if (typeof body.orden === 'number') patch.orden = body.orden
  if (typeof body.activo === 'boolean') patch.activo = body.activo

  const db = getDb()
  await db.update(categorias).set(patch).where(eq(categorias.id, id))
  const row = await db.select().from(categorias).where(eq(categorias.id, id))
  return NextResponse.json(row[0] ?? null)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { id } = await params

  const db = getDb()
  await db.update(categorias)
    .set({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .where(eq(categorias.id, id))
  return NextResponse.json({ ok: true })
}
