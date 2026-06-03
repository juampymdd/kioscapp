import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/src/db'
import { compras } from '@/src/db/schema'
import { and, eq } from 'drizzle-orm'
import { getSession } from '@/src/lib/session'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { id } = await params
  const db = getDb()
  await db.update(compras)
    .set({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .where(and(eq(compras.id, id), eq(compras.user_id, session.userId)))
  return NextResponse.json({ ok: true })
}
