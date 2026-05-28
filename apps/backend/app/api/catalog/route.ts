/**
 * GET /api/catalog?since=<ISO8601>
 * Devuelve productos y stock actualizados después de `since`.
 * El local usa este endpoint para sincronizar el catálogo descendente.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/src/db'
import { productos, stock } from '@/src/db/schema'
import { gte } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const since = req.nextUrl.searchParams.get('since')

  const productosQuery = db.select().from(productos)
  const stockQuery = db.select().from(stock)

  if (since) {
    productosQuery.where(gte(productos.updated_at, since))
    stockQuery.where(gte(stock.updated_at, since))
  }

  const [productosData, stockData] = await Promise.all([productosQuery, stockQuery])

  return NextResponse.json({
    productos: productosData,
    stock: stockData,
    generado_at: new Date().toISOString(),
  })
}

/**
 * POST /api/catalog
 * Upsert de productos desde el panel admin.
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!Array.isArray(body.productos)) {
    return NextResponse.json({ error: 'productos[] requerido' }, { status: 400 })
  }

  await db
    .insert(productos)
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

  return NextResponse.json({ ok: true, upserted: body.productos.length })
}
