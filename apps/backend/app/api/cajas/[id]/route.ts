import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/src/db'
import { movimientos_caja } from '@/src/db/schema'
import { eq, isNull, and } from 'drizzle-orm'
import { getSession } from '@/src/lib/session'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { id } = await params

  const db = getDb()
  const rows = await db.select().from(movimientos_caja)
    .where(and(eq(movimientos_caja.caja_id, id), isNull(movimientos_caja.deleted_at)))
  rows.sort((a, b) => a.created_at.localeCompare(b.created_at))
  return NextResponse.json(rows)
}
