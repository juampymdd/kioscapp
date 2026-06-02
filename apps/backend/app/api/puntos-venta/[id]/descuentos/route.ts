import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/src/db'
import { puntos_venta, sucursales, descuentos } from '@/src/db/schema'
import { and, eq, isNull, or } from 'drizzle-orm'
import { optionsResponse, withCors } from '@/src/lib/cors'

async function resolverPV(pvId: string, secret: string) {
  const db = getDb()
  const rows = await db
    .select({ sync_secret: puntos_venta.sync_secret, user_id: sucursales.user_id, sucursal_id: sucursales.id })
    .from(puntos_venta)
    .innerJoin(sucursales, eq(puntos_venta.sucursal_id, sucursales.id))
    .where(and(eq(puntos_venta.id, pvId), eq(puntos_venta.activo, true)))
  if (rows.length === 0 || rows[0].sync_secret !== secret) return null
  return { userId: rows[0].user_id, sucursalId: rows[0].sucursal_id }
}

export function OPTIONS() { return optionsResponse() }

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const secret = req.headers.get('x-sync-secret') ?? ''
  const pv = secret ? await resolverPV(id, secret) : null
  if (!pv) return withCors(NextResponse.json({ error: 'No autorizado' }, { status: 401 }))

  const db = getDb()
  const rows = await db.select().from(descuentos).where(
    and(
      eq(descuentos.user_id, pv.userId),
      eq(descuentos.activo, true),
      isNull(descuentos.deleted_at),
      or(isNull(descuentos.sucursal_id), eq(descuentos.sucursal_id, pv.sucursalId)),
    ),
  )
  return withCors(NextResponse.json({ descuentos: rows, sucursal_id: pv.sucursalId }))
}

// Promo local creada en la caja: se guarda scopeada a la sucursal del punto de venta.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const secret = req.headers.get('x-sync-secret') ?? ''
  const pv = secret ? await resolverPV(id, secret) : null
  if (!pv) return withCors(NextResponse.json({ error: 'No autorizado' }, { status: 401 }))

  let body: {
    id?: string
    objetivo?: 'producto' | 'categoria'
    producto_id?: string | null
    categoria?: string | null
    tipo?: 'monto' | 'porcentaje'
    valor?: number
    activo?: boolean
    deleted_at?: string | null
    created_at?: string
  }
  try { body = await req.json() } catch { return withCors(NextResponse.json({ error: 'JSON inválido' }, { status: 400 })) }

  if (!body.id) return withCors(NextResponse.json({ error: 'id requerido' }, { status: 400 }))
  if (body.objetivo !== 'producto' && body.objetivo !== 'categoria')
    return withCors(NextResponse.json({ error: 'objetivo inválido' }, { status: 400 }))
  if (body.tipo !== 'monto' && body.tipo !== 'porcentaje')
    return withCors(NextResponse.json({ error: 'tipo inválido' }, { status: 400 }))
  if (typeof body.valor !== 'number' || body.valor <= 0)
    return withCors(NextResponse.json({ error: 'valor debe ser > 0' }, { status: 400 }))

  const db = getDb()
  const now = new Date().toISOString()
  // Upsert por id (UUID del cliente): permite reenvío idempotente y editar/desactivar locales.
  await db.insert(descuentos).values({
    id:          body.id,
    local_id:    id,
    user_id:     pv.userId,
    sucursal_id: pv.sucursalId,
    objetivo:    body.objetivo,
    producto_id: body.objetivo === 'producto' ? (body.producto_id ?? null) : null,
    categoria:   body.objetivo === 'categoria' ? (body.categoria ?? null) : null,
    tipo:        body.tipo,
    valor:       body.valor,
    activo:      body.activo ?? true,
    sync_status: 'synced',
    created_at:  body.created_at ?? now,
    updated_at:  now,
    deleted_at:  body.deleted_at ?? null,
  }).onConflictDoUpdate({
    target: descuentos.id,
    set: {
      valor:      body.valor,
      activo:     body.activo ?? true,
      deleted_at: body.deleted_at ?? null,
      updated_at: now,
    },
  })

  return withCors(NextResponse.json({ ok: true }))
}
