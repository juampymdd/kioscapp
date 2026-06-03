import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/src/db'
import { categorias } from '@/src/db/schema'
import { isNull, eq } from 'drizzle-orm'
import { getSession } from '@/src/lib/session'
import { normalizarSlug } from '@kioscapp/shared'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const db = getDb()
  const rows = await db.select().from(categorias).where(isNull(categorias.deleted_at))
  rows.sort((a, b) => a.orden - b.orden)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let body: { nombre?: string; icono?: string; color?: string | null; orden?: number; activo?: boolean }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  if (!body.nombre?.trim()) return NextResponse.json({ error: 'nombre requerido' }, { status: 400 })

  const db = getDb()
  const now = new Date().toISOString()
  const id = normalizarSlug(body.nombre)
  await db.insert(categorias).values({
    id,
    local_id:   'central',
    nombre:     body.nombre.trim(),
    icono:      body.icono ?? 'Package',
    color:      body.color ?? null,
    orden:      body.orden ?? 100,
    activo:     body.activo ?? true,
    sync_status: 'synced',
    created_at: now,
    updated_at: now,
  }).onConflictDoUpdate({
    target: categorias.id,
    set: { nombre: body.nombre.trim(), icono: body.icono ?? 'Package', color: body.color ?? null,
           orden: body.orden ?? 100, activo: body.activo ?? true, updated_at: now, deleted_at: null },
  })

  const row = await db.select().from(categorias).where(eq(categorias.id, id))
  return NextResponse.json(row[0], { status: 201 })
}
