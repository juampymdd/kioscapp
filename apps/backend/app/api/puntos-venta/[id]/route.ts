import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/src/db'
import { puntos_venta, sucursales } from '@/src/db/schema'
import { and, eq } from 'drizzle-orm'
import { getSession } from '@/src/lib/session'

// Returns pv only if it belongs to a sucursal owned by userId
async function getPvOwned(userId: string, pvId: string) {
  const db = getDb()
  const rows = await db.select({ pv: puntos_venta })
    .from(puntos_venta)
    .innerJoin(sucursales, eq(puntos_venta.sucursal_id, sucursales.id))
    .where(and(eq(puntos_venta.id, pvId), eq(sucursales.user_id, userId)))
  return rows[0]?.pv ?? null
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { id } = await params
  const pv = await getPvOwned(session.userId, id)
  if (!pv) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(pv)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { id } = await params
  const pv = await getPvOwned(session.userId, id)
  if (!pv) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  let body: { nombre?: string; regenerar_secret?: boolean }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const db = getDb()
  const set: Partial<typeof pv> = {}
  if (body.nombre !== undefined)  set.nombre      = body.nombre.trim()
  if (body.regenerar_secret)      set.sync_secret = crypto.randomUUID()
  if (!Object.keys(set).length)   return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })

  await db.update(puntos_venta).set(set).where(eq(puntos_venta.id, id))
  return NextResponse.json(await getPvOwned(session.userId, id))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { id } = await params
  if (!await getPvOwned(session.userId, id)) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  const db = getDb()
  await db.update(puntos_venta).set({ activo: false }).where(eq(puntos_venta.id, id))
  return NextResponse.json({ ok: true })
}
