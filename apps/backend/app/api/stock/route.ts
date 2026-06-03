import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/src/db'
import { stock, productos, puntos_venta, sucursales } from '@/src/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { getSession } from '@/src/lib/session'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const sucursalFiltro = req.nextUrl.searchParams.get('sucursal')

  const db = getDb()
  const rows = await db.select({
    id: stock.id,
    cantidad: stock.cantidad,
    alerta_minimo: stock.alerta_minimo,
    producto: productos.descripcion,
    activo: productos.activo,
    sucId: sucursales.id,
    sucursal: sucursales.nombre,
    caja: puntos_venta.nombre,
  })
    .from(stock)
    .innerJoin(puntos_venta, eq(stock.local_id, puntos_venta.id))
    .innerJoin(sucursales, eq(puntos_venta.sucursal_id, sucursales.id))
    .innerJoin(productos, eq(stock.producto_id, productos.id))
    .where(and(eq(sucursales.user_id, session.userId), isNull(stock.deleted_at), isNull(productos.deleted_at)))

  const filtradas = (sucursalFiltro ? rows.filter(r => r.sucId === sucursalFiltro) : rows)
    .map(r => ({ ...r, bajo: Number(r.cantidad) <= Number(r.alerta_minimo) }))
  filtradas.sort((a, b) => Number(b.bajo) - Number(a.bajo) || a.producto.localeCompare(b.producto))
  return NextResponse.json(filtradas)
}
