import { getDb } from '@/src/db'
import { ventas, venta_items, productos, cajas, puntos_venta, sucursales } from '@/src/db/schema'
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm'

// Todas las agrupaciones por fecha/hora se hacen en hora local de Argentina,
// porque created_at se guarda en UTC (ISO con Z).
const TZ = 'America/Argentina/Buenos_Aires'

export interface SucursalCard {
  id: string
  nombre: string
  ciudad: string | null
  provincia: string | null
  activo: boolean
  cajas: number
  totalHoyCentavos: number
}

export interface DashboardData {
  empty: boolean
  // KPIs (en centavos salvo donde se indica)
  totalHoyCentavos: number
  cantidadHoy: number
  totalMesCentavos: number
  cantidadMes: number
  ticketPromedioCentavos: number
  unidadesVendidas: number
  cajasAbiertas: number
  // Series listas para graficar (montos en pesos)
  ventasPorDia: { fecha: string; montoPesos: number; cantidad: number }[]
  mediosPago: { name: string; montoPesos: number; cantidad: number }[]
  ventasPorHora: { hora: string; montoPesos: number; cantidad: number }[]
  topProductos: { name: string; montoPesos: number; cantidad: number }[]
  ventasPorSucursal: { name: string; montoPesos: number; cantidad: number }[]
  ventasPorCategoria: { name: string; montoPesos: number }[]
  // Tarjetas de sucursales
  sucursales: SucursalCard[]
}

const MEDIO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  debito: 'Débito',
  credito: 'Crédito',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  qr: 'QR',
  mercadopago: 'Mercado Pago',
}

function labelMedio(m: string): string {
  return MEDIO_LABEL[m?.toLowerCase()] ?? (m ? m.charAt(0).toUpperCase() + m.slice(1) : 'Otro')
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const db = getDb()

  // Puntos de venta del usuario (su id ES el local_id que usa el desktop)
  const pvList = await db
    .select({
      id: puntos_venta.id,
      sucursal_id: puntos_venta.sucursal_id,
      activo_pv: puntos_venta.activo,
    })
    .from(puntos_venta)
    .innerJoin(sucursales, eq(puntos_venta.sucursal_id, sucursales.id))
    .where(eq(sucursales.user_id, userId))

  const sucList = await db
    .select()
    .from(sucursales)
    .where(eq(sucursales.user_id, userId))

  const localIds = pvList.map(p => p.id)
  const sucDeLocal = new Map(pvList.map(p => [p.id, p.sucursal_id]))

  // Sin puntos de venta → nada que graficar
  const emptyShell: DashboardData = {
    empty: true,
    totalHoyCentavos: 0, cantidadHoy: 0, totalMesCentavos: 0, cantidadMes: 0,
    ticketPromedioCentavos: 0, unidadesVendidas: 0, cajasAbiertas: 0,
    ventasPorDia: [], mediosPago: [], ventasPorHora: [], topProductos: [],
    ventasPorSucursal: [], ventasPorCategoria: [],
    sucursales: sucList.map(s => ({
      id: s.id, nombre: s.nombre, ciudad: s.ciudad, provincia: s.provincia,
      activo: s.activo, cajas: 0, totalHoyCentavos: 0,
    })),
  }
  if (localIds.length === 0) return emptyShell

  // Ventana de 30 días (cota inferior en UTC; el agrupado usa hora AR)
  const desde = new Date()
  desde.setDate(desde.getDate() - 29)
  const desdeIso = `${desde.toISOString().slice(0, 10)}T00:00:00.000Z`
  const hoyAR = new Date().toLocaleDateString('en-CA', { timeZone: TZ }) // YYYY-MM-DD

  // Expresiones SQL reutilizables (hora local AR)
  const localDate = sql<string>`to_char((${ventas.created_at}::timestamptz AT TIME ZONE ${TZ}), 'YYYY-MM-DD')`
  const localHour = sql<number>`EXTRACT(HOUR FROM (${ventas.created_at}::timestamptz AT TIME ZONE ${TZ}))`
  const vendidas = and(
    inArray(ventas.local_id, localIds),
    eq(ventas.anulada, false),
    gte(ventas.created_at, desdeIso),
  )

  const [
    porDia, porMedio, porHora, topProd, porCat, porLocal,
    cajasAbiertasRows, pvCounts, unidadesRows, totalHoyPorLocal,
  ] = await Promise.all([
      db.select({
        fecha: localDate,
        total: sql<number>`COALESCE(SUM(${ventas.total_centavos}), 0)`,
        cantidad: sql<number>`COUNT(*)`,
      }).from(ventas).where(vendidas).groupBy(localDate),

      db.select({
        medio: ventas.medio_pago,
        total: sql<number>`COALESCE(SUM(${ventas.total_centavos}), 0)`,
        cantidad: sql<number>`COUNT(*)`,
      }).from(ventas).where(vendidas).groupBy(ventas.medio_pago),

      db.select({
        hora: localHour,
        total: sql<number>`COALESCE(SUM(${ventas.total_centavos}), 0)`,
        cantidad: sql<number>`COUNT(*)`,
      }).from(ventas).where(vendidas).groupBy(localHour),

      db.select({
        descripcion: venta_items.descripcion,
        total: sql<number>`COALESCE(SUM(${venta_items.subtotal_centavos}), 0)`,
        cantidad: sql<number>`COALESCE(SUM(${venta_items.cantidad}), 0)`,
      }).from(venta_items)
        .innerJoin(ventas, eq(venta_items.venta_id, ventas.id))
        .where(vendidas)
        .groupBy(venta_items.descripcion)
        .orderBy(desc(sql`SUM(${venta_items.subtotal_centavos})`))
        .limit(8),

      db.select({
        categoria: productos.categoria,
        total: sql<number>`COALESCE(SUM(${venta_items.subtotal_centavos}), 0)`,
      }).from(venta_items)
        .innerJoin(ventas, eq(venta_items.venta_id, ventas.id))
        .innerJoin(productos, eq(venta_items.producto_id, productos.id))
        .where(vendidas)
        .groupBy(productos.categoria)
        .orderBy(desc(sql`SUM(${venta_items.subtotal_centavos})`)),

      db.select({
        local_id: ventas.local_id,
        total: sql<number>`COALESCE(SUM(${ventas.total_centavos}), 0)`,
        cantidad: sql<number>`COUNT(*)`,
      }).from(ventas).where(vendidas).groupBy(ventas.local_id),

      db.select({ cantidad: sql<number>`COUNT(*)` })
        .from(cajas)
        .where(and(inArray(cajas.local_id, localIds), eq(cajas.estado, 'abierta'))),

      db.select({
        sucursal_id: puntos_venta.sucursal_id,
        cantidad: sql<number>`COUNT(*)`,
      }).from(puntos_venta)
        .where(and(inArray(puntos_venta.id, localIds), eq(puntos_venta.activo, true)))
        .groupBy(puntos_venta.sucursal_id),

      // Unidades totales vendidas en el período
      db.select({ total: sql<number>`COALESCE(SUM(${venta_items.cantidad}), 0)` })
        .from(venta_items)
        .innerJoin(ventas, eq(venta_items.venta_id, ventas.id))
        .where(vendidas),

      // Ventas de HOY por punto de venta (para las tarjetas de sucursal)
      db.select({
        local_id: ventas.local_id,
        total: sql<number>`COALESCE(SUM(${ventas.total_centavos}), 0)`,
      }).from(ventas)
        .where(and(inArray(ventas.local_id, localIds), eq(ventas.anulada, false), eq(localDate, hoyAR)))
        .groupBy(ventas.local_id),
    ])

  const toPesos = (c: number) => Math.round(Number(c)) / 100

  // --- Serie por día: rellenar los 30 días para una línea continua ---
  const totalPorFecha = new Map(porDia.map(d => [d.fecha, Number(d.total)]))
  const cantPorFecha = new Map(porDia.map(d => [d.fecha, Number(d.cantidad)]))
  const ventasPorDia: DashboardData['ventasPorDia'] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toLocaleDateString('en-CA', { timeZone: TZ })
    const [, mm, dd] = key.split('-')
    ventasPorDia.push({
      fecha: `${dd}/${mm}`,
      montoPesos: toPesos(totalPorFecha.get(key) ?? 0),
      cantidad: cantPorFecha.get(key) ?? 0,
    })
  }

  // --- KPIs ---
  const totalMesCentavos = porDia.reduce((s, d) => s + Number(d.total), 0)
  const cantidadMes = porDia.reduce((s, d) => s + Number(d.cantidad), 0)
  const totalHoyCentavos = Number(totalPorFecha.get(hoyAR) ?? 0)
  const cantidadHoy = Number(cantPorFecha.get(hoyAR) ?? 0)
  const ticketPromedioCentavos = cantidadMes > 0 ? Math.round(totalMesCentavos / cantidadMes) : 0

  // --- Medios de pago ---
  const mediosPago = porMedio
    .map(m => ({ name: labelMedio(m.medio), montoPesos: toPesos(Number(m.total)), cantidad: Number(m.cantidad) }))
    .sort((a, b) => b.montoPesos - a.montoPesos)

  // --- Por hora (0..23, completo) ---
  const totalPorHora = new Map(porHora.map(h => [Number(h.hora), Number(h.total)]))
  const cantPorHora = new Map(porHora.map(h => [Number(h.hora), Number(h.cantidad)]))
  const ventasPorHora: DashboardData['ventasPorHora'] = []
  for (let h = 0; h < 24; h++) {
    ventasPorHora.push({
      hora: `${String(h).padStart(2, '0')}h`,
      montoPesos: toPesos(totalPorHora.get(h) ?? 0),
      cantidad: cantPorHora.get(h) ?? 0,
    })
  }

  // --- Top productos ---
  const topProductos = topProd.map(p => ({
    name: p.descripcion,
    montoPesos: toPesos(Number(p.total)),
    cantidad: Math.round(Number(p.cantidad) * 100) / 100,
  }))

  // --- Por categoría ---
  const ventasPorCategoria = porCat.map(c => ({
    name: c.categoria || 'Sin categoría',
    montoPesos: toPesos(Number(c.total)),
  }))

  // --- Por sucursal (agregando los puntos de venta) ---
  const totalPorSuc = new Map<string, { total: number; cantidad: number }>()
  for (const row of porLocal) {
    const sid = sucDeLocal.get(row.local_id)
    if (!sid) continue
    const prev = totalPorSuc.get(sid) ?? { total: 0, cantidad: 0 }
    totalPorSuc.set(sid, { total: prev.total + Number(row.total), cantidad: prev.cantidad + Number(row.cantidad) })
  }
  const ventasPorSucursal = sucList
    .map(s => ({
      name: s.nombre,
      montoPesos: toPesos(totalPorSuc.get(s.id)?.total ?? 0),
      cantidad: totalPorSuc.get(s.id)?.cantidad ?? 0,
    }))
    .sort((a, b) => b.montoPesos - a.montoPesos)

  // --- Tarjetas de sucursal (ventas HOY por sucursal) ---
  const hoyPorSuc = new Map<string, number>()
  for (const row of totalHoyPorLocal) {
    const sid = sucDeLocal.get(row.local_id)
    if (!sid) continue
    hoyPorSuc.set(sid, (hoyPorSuc.get(sid) ?? 0) + Number(row.total))
  }
  const cajasPorSuc = new Map(pvCounts.map(r => [r.sucursal_id, Number(r.cantidad)]))

  const sucursalesCards: SucursalCard[] = sucList.map(s => ({
    id: s.id,
    nombre: s.nombre,
    ciudad: s.ciudad,
    provincia: s.provincia,
    activo: s.activo,
    cajas: cajasPorSuc.get(s.id) ?? 0,
    totalHoyCentavos: hoyPorSuc.get(s.id) ?? 0,
  }))

  return {
    empty: cantidadMes === 0,
    totalHoyCentavos,
    cantidadHoy,
    totalMesCentavos,
    cantidadMes,
    ticketPromedioCentavos,
    unidadesVendidas: Math.round(Number(unidadesRows[0]?.total ?? 0)),
    cajasAbiertas: Number(cajasAbiertasRows[0]?.cantidad ?? 0),
    ventasPorDia,
    mediosPago,
    ventasPorHora,
    topProductos,
    ventasPorSucursal,
    ventasPorCategoria,
    sucursales: sucursalesCards,
  }
}
