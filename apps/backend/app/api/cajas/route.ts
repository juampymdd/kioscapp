import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/src/db'
import { cajas, ventas } from '@/src/db/schema'
import { and, eq, inArray, desc } from 'drizzle-orm'
import { getSession } from '@/src/lib/session'
import { pvDelUsuario } from '../ventas/route'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const pvs = await pvDelUsuario(session.userId)
  const porPv = Object.fromEntries(pvs.map(p => [p.pvId, p]))
  const sucursalFiltro = req.nextUrl.searchParams.get('sucursal')
  const ids = pvs.filter(p => !sucursalFiltro || p.sucId === sucursalFiltro).map(p => p.pvId)
  if (ids.length === 0) return NextResponse.json([])

  const db = getDb()
  const cajasRows = await db.select().from(cajas)
    .where(and(inArray(cajas.local_id, ids)))
    .orderBy(desc(cajas.apertura_at)).limit(200)

  const cajaIds = cajasRows.map(c => c.id)
  const vts = cajaIds.length
    ? await db.select().from(ventas).where(inArray(ventas.caja_id, cajaIds))
    : []

  // Acumular ventas por caja (netas) y efectivo.
  const acc: Record<string, { total: number; efectivo: number; cant: number }> = {}
  for (const v of vts) {
    if (v.anulada) continue
    const a = acc[v.caja_id] ?? { total: 0, efectivo: 0, cant: 0 }
    a.total += v.total_centavos
    if (v.medio_pago === 'efectivo') a.efectivo += v.total_centavos
    a.cant += 1
    acc[v.caja_id] = a
  }

  return NextResponse.json(cajasRows.map(c => {
    const a = acc[c.id] ?? { total: 0, efectivo: 0, cant: 0 }
    const esperadoEfectivo = c.monto_apertura_centavos + a.efectivo
    const diferencia = c.monto_cierre_centavos != null ? c.monto_cierre_centavos - esperadoEfectivo : null
    return {
      ...c,
      sucursal_nombre: porPv[c.local_id]?.sucNombre ?? '—',
      caja_nombre: porPv[c.local_id]?.pvNombre ?? '—',
      total_ventas_centavos: a.total,
      total_efectivo_centavos: a.efectivo,
      cantidad_ventas: a.cant,
      esperado_efectivo_centavos: esperadoEfectivo,
      diferencia_centavos: diferencia,
    }
  }))
}
