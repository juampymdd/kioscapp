import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/src/db'
import { venta_items } from '@/src/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/src/lib/session'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { id } = await params

  const db = getDb()
  const rows = await db.select().from(venta_items).where(eq(venta_items.venta_id, id))
  return NextResponse.json(rows)
}
