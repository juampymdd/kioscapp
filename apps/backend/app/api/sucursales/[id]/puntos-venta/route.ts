import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/src/db'
import { sucursales, puntos_venta } from '@/src/db/schema'
import { and, eq } from 'drizzle-orm'
import { getSession } from '@/src/lib/session'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const db = getDb()

  // Verify ownership
  const suc = await db.select({ id: sucursales.id }).from(sucursales)
    .where(and(eq(sucursales.id, id), eq(sucursales.user_id, session.userId)))
  if (!suc.length) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const pvs = await db.select().from(puntos_venta).where(eq(puntos_venta.sucursal_id, id))
  return NextResponse.json(pvs)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const db = getDb()

  const suc = await db.select({ id: sucursales.id }).from(sucursales)
    .where(and(eq(sucursales.id, id), eq(sucursales.user_id, session.userId)))
  if (!suc.length) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  let body: { nombre?: string }
  try { body = await req.json() } catch { body = {} }

  const pvId = crypto.randomUUID()
  const sync_secret = crypto.randomUUID()

  await db.insert(puntos_venta).values({
    id:          pvId,
    sucursal_id: id,
    nombre:      body.nombre?.trim() || 'Caja',
    sync_secret,
    activo:      true,
    created_at:  new Date().toISOString(),
  })

  const row = await db.select().from(puntos_venta).where(eq(puntos_venta.id, pvId))
  return NextResponse.json(row[0], { status: 201 })
}
