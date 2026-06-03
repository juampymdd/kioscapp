import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/src/db'
import { descuentos } from '@/src/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { getSession } from '@/src/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const db = getDb()
  const rows = await db.select().from(descuentos)
    .where(and(eq(descuentos.user_id, session.userId), isNull(descuentos.deleted_at)))
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let body: {
    sucursal_id?: string | null
    objetivo?: 'producto' | 'categoria' | 'todos'
    producto_id?: string | null
    categoria?: string | null
    tipo?: 'monto' | 'porcentaje'
    valor?: number
    dias_semana?: string | null
    vigencia_desde?: string | null
    vigencia_hasta?: string | null
    hora_desde?: number | null
    hora_hasta?: number | null
    medio_pago?: string | null
  }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  if (body.objetivo !== 'producto' && body.objetivo !== 'categoria' && body.objetivo !== 'todos')
    return NextResponse.json({ error: 'objetivo inválido' }, { status: 400 })
  if (body.tipo !== 'monto' && body.tipo !== 'porcentaje')
    return NextResponse.json({ error: 'tipo inválido' }, { status: 400 })
  if (typeof body.valor !== 'number' || body.valor <= 0)
    return NextResponse.json({ error: 'valor debe ser > 0' }, { status: 400 })
  if (body.objetivo === 'producto' && !body.producto_id)
    return NextResponse.json({ error: 'producto_id requerido' }, { status: 400 })
  if (body.objetivo === 'categoria' && !body.categoria)
    return NextResponse.json({ error: 'categoria requerida' }, { status: 400 })

  const db = getDb()
  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  await db.insert(descuentos).values({
    id,
    local_id:    'central',
    user_id:     session.userId,
    sucursal_id: body.sucursal_id ?? null,
    objetivo:    body.objetivo,
    producto_id: body.objetivo === 'producto' ? body.producto_id! : null,
    categoria:   body.objetivo === 'categoria' ? body.categoria! : null,
    tipo:        body.tipo,
    valor:       body.valor,
    activo:      true,
    dias_semana:    body.dias_semana ?? null,
    vigencia_desde: body.vigencia_desde ?? null,
    vigencia_hasta: body.vigencia_hasta ?? null,
    hora_desde:     body.hora_desde ?? null,
    hora_hasta:     body.hora_hasta ?? null,
    medio_pago:     body.medio_pago ?? null,
    sync_status: 'synced',
    created_at:  now,
    updated_at:  now,
  })

  const row = await db.select().from(descuentos).where(eq(descuentos.id, id))
  return NextResponse.json(row[0], { status: 201 })
}
