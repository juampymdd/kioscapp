import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/src/db'
import { puntos_venta } from '@/src/db/schema'
import { and, eq } from 'drizzle-orm'
import { getSession } from '@/src/lib/session'

async function getOwned(userId: string, id: string) {
  const db = getDb()
  const rows = await db.select().from(puntos_venta)
    .where(and(eq(puntos_venta.id, id), eq(puntos_venta.user_id, userId)))
  return rows[0] ?? null
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const pv = await getOwned(session.userId, id)
  if (!pv) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  return NextResponse.json(pv)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const pv = await getOwned(session.userId, id)
  if (!pv) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  let body: { nombre?: string; direccion?: string; ciudad?: string; provincia?: string; regenerar_secret?: boolean }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const db = getDb()
  const set: Partial<typeof pv> = {}
  if (body.nombre !== undefined)    set.nombre    = body.nombre.trim()
  if (body.direccion !== undefined) set.direccion = body.direccion || null
  if (body.ciudad !== undefined)    set.ciudad    = body.ciudad || null
  if (body.provincia !== undefined) set.provincia = body.provincia || null
  if (body.regenerar_secret)        set.sync_secret = crypto.randomUUID()

  if (Object.keys(set).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  await db.update(puntos_venta).set(set).where(eq(puntos_venta.id, id))
  const updated = await getOwned(session.userId, id)
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const pv = await getOwned(session.userId, id)
  if (!pv) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const db = getDb()
  await db.update(puntos_venta).set({ activo: false }).where(eq(puntos_venta.id, id))
  return NextResponse.json({ ok: true })
}
