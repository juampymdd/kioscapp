import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/src/db'
import { sucursales } from '@/src/db/schema'
import { and, eq } from 'drizzle-orm'
import { getSession } from '@/src/lib/session'

async function getOwned(userId: string, id: string) {
  const db = getDb()
  const rows = await db.select().from(sucursales)
    .where(and(eq(sucursales.id, id), eq(sucursales.user_id, userId)))
  return rows[0] ?? null
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { id } = await params
  const suc = await getOwned(session.userId, id)
  if (!suc) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(suc)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { id } = await params
  const suc = await getOwned(session.userId, id)
  if (!suc) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  let body: { nombre?: string; direccion?: string; ciudad?: string; provincia?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const db = getDb()
  const set: Partial<typeof suc> = {}
  if (body.nombre    !== undefined) set.nombre    = body.nombre.trim()
  if (body.direccion !== undefined) set.direccion = body.direccion || null
  if (body.ciudad    !== undefined) set.ciudad    = body.ciudad    || null
  if (body.provincia !== undefined) set.provincia = body.provincia || null
  if (!Object.keys(set).length) return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })

  await db.update(sucursales).set(set).where(eq(sucursales.id, id))
  return NextResponse.json(await getOwned(session.userId, id))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { id } = await params
  if (!await getOwned(session.userId, id)) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  const db = getDb()
  await db.update(sucursales).set({ activo: false }).where(eq(sucursales.id, id))
  return NextResponse.json({ ok: true })
}
