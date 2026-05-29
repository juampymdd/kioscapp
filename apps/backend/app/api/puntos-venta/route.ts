import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/src/db'
import { puntos_venta } from '@/src/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/src/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const db = getDb()
  const rows = await db.select().from(puntos_venta)
    .where(eq(puntos_venta.user_id, session.userId))

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let body: { nombre?: string; direccion?: string; ciudad?: string; provincia?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  if (!body.nombre?.trim()) {
    return NextResponse.json({ error: 'nombre es requerido' }, { status: 400 })
  }

  const db = getDb()
  const id = crypto.randomUUID()
  const sync_secret = crypto.randomUUID()
  const ts = new Date().toISOString()

  await db.insert(puntos_venta).values({
    id,
    user_id:     session.userId,
    nombre:      body.nombre.trim(),
    direccion:   body.direccion ?? null,
    ciudad:      body.ciudad ?? null,
    provincia:   body.provincia ?? null,
    sync_secret,
    activo:      true,
    created_at:  ts,
  })

  const row = await db.select().from(puntos_venta).where(eq(puntos_venta.id, id))
  return NextResponse.json(row[0], { status: 201 })
}
