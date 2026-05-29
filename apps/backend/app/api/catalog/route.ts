import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/src/db'
import { productos, stock } from '@/src/db/schema'
import { gte } from 'drizzle-orm'
import { optionsResponse, withCors } from '@/src/lib/cors'

export const dynamic = 'force-dynamic'

export function OPTIONS() { return optionsResponse() }

export async function GET(req: NextRequest) {
  const db = getDb()
  const since = req.nextUrl.searchParams.get('since')

  const [productosData, stockData] = await Promise.all([
    since
      ? db.select().from(productos).where(gte(productos.updated_at, since))
      : db.select().from(productos),
    since
      ? db.select().from(stock).where(gte(stock.updated_at, since))
      : db.select().from(stock),
  ])

  return withCors(NextResponse.json({
    productos: productosData,
    stock: stockData,
    generado_at: new Date().toISOString(),
  }))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!Array.isArray(body.productos)) {
    return withCors(NextResponse.json({ error: 'productos[] requerido' }, { status: 400 }))
  }

  const db = getDb()
  await db.insert(productos)
    .values(body.productos)
    .onConflictDoUpdate({
      target: productos.id,
      set: {
        descripcion:     productos.descripcion,
        precio_centavos: productos.precio_centavos,
        activo:          productos.activo,
        updated_at:      productos.updated_at,
      },
    })

  return withCors(NextResponse.json({ ok: true, upserted: body.productos.length }))
}
