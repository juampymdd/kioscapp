import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/src/db'
import { descuentos } from '@/src/db/schema'
import { and, eq } from 'drizzle-orm'
import { getSession } from '@/src/lib/session'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { id } = await params

  let body: { valor?: number; activo?: boolean }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.valor === 'number' && body.valor > 0) patch.valor = body.valor
  if (typeof body.activo === 'boolean') patch.activo = body.activo

  const db = getDb()
  await db.update(descuentos).set(patch)
    .where(and(eq(descuentos.id, id), eq(descuentos.user_id, session.userId)))
  const row = await db.select().from(descuentos).where(eq(descuentos.id, id))
  return NextResponse.json(row[0] ?? null)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { id } = await params

  const db = getDb()
  await db.update(descuentos)
    .set({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .where(and(eq(descuentos.id, id), eq(descuentos.user_id, session.userId)))
  return NextResponse.json({ ok: true })
}
