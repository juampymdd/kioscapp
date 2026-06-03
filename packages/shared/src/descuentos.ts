import type { CategoriaProducto } from './types/producto'
import type { Descuento } from './types/descuento'

export interface DescuentoItemInput {
  producto_id: string
  categoria: CategoriaProducto
  subtotal_centavos: number
}

/** Origen del descuento aplicado a un ítem. */
export type OrigenDescuento = 'promo' | 'manual'

export interface DescuentoResuelto {
  /** Centavos a descontar (>= 0, <= subtotal). */
  centavos: number
  /** De dónde sale el descuento, o null si no hay. */
  origen: OrigenDescuento | null
  /** Detalle legible del tipo (ej '10%'); null si es monto fijo. */
  detalle: string | null
}

/** Etiqueta del tipo de descuento: '10%' para porcentaje, null para monto fijo. */
export function detalleDescuento(d: Descuento): string | null {
  return d.tipo === 'porcentaje' ? `${d.valor}%` : null
}

const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MEDIO_LABELS: Record<string, string> = {
  efectivo: 'Efectivo', debito: 'Débito', credito: 'Crédito', qr_mercado_pago: 'QR / MP',
}

/** 'HH:MM' → minutos del día. '' → null. */
export function horaAMin(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

/** minutos del día → 'HH:MM'. null → ''. */
export function minAHora(min: number | null | undefined): string {
  if (min == null) return ''
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

/** Texto legible de las condiciones de una promo (días · fechas · horario · medio). */
export function condicionesTexto(d: Descuento): string {
  const partes: string[] = []
  if (d.dias_semana) {
    const dias = d.dias_semana.split(',').map(s => s.trim()).filter(Boolean).map(Number)
    if (dias.length && dias.length < 7) partes.push(dias.map(n => DIAS_CORTOS[n]).join(', '))
  }
  if (d.vigencia_desde || d.vigencia_hasta) {
    const f = (s?: string | null) => s ? s.split('-').reverse().slice(0, 2).join('/') : '…'
    partes.push(`${f(d.vigencia_desde)}–${f(d.vigencia_hasta)}`)
  }
  if (d.hora_desde != null || d.hora_hasta != null) {
    partes.push(`${minAHora(d.hora_desde) || '00:00'}–${minAHora(d.hora_hasta) || '23:59'}`)
  }
  if (d.medio_pago) partes.push(MEDIO_LABELS[d.medio_pago] ?? d.medio_pago)
  return partes.join(' · ')
}

/** Centavos a descontar para un descuento dado, clampeado al subtotal. */
export function calcularDescuento(d: Descuento, subtotal_centavos: number): number {
  const raw = d.tipo === 'porcentaje'
    ? Math.floor((subtotal_centavos * d.valor) / 100)
    : d.valor
  return Math.max(0, Math.min(raw, subtotal_centavos))
}

function matchea(d: Descuento, item: DescuentoItemInput): boolean {
  if (d.objetivo === 'producto') return d.producto_id === item.producto_id
  return d.categoria === item.categoria
}

/** Contexto de aplicación: cuándo y con qué medio se está cobrando. */
export interface DescuentoCtx {
  fecha: Date
  /** Medio elegido en el cobro; null mientras no se eligió (carrito). */
  medio: string | null
}

function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** ¿La promo está vigente para el contexto (día/fecha/hora/medio)? */
export function promoVigente(d: Descuento, ctx: DescuentoCtx): boolean {
  // Días de la semana
  if (d.dias_semana) {
    const dias = d.dias_semana.split(',').map(s => s.trim()).filter(Boolean).map(Number)
    if (dias.length && !dias.includes(ctx.fecha.getDay())) return false
  }
  // Rango de fechas (comparación por fecha local YYYY-MM-DD)
  const hoy = ymd(ctx.fecha)
  if (d.vigencia_desde && hoy < d.vigencia_desde) return false
  if (d.vigencia_hasta && hoy > d.vigencia_hasta) return false
  // Franja horaria (minutos del día)
  if (d.hora_desde != null || d.hora_hasta != null) {
    const min = ctx.fecha.getHours() * 60 + ctx.fecha.getMinutes()
    if (d.hora_desde != null && min < d.hora_desde) return false
    if (d.hora_hasta != null && min > d.hora_hasta) return false
  }
  // Medio de pago
  if (d.medio_pago) {
    if (ctx.medio == null) return false       // aún no se eligió → no aplica todavía
    if (ctx.medio !== d.medio_pago) return false
  }
  return true
}

/** Rank de prioridad de catálogo: sucursal(2) sobre global(1); producto(2) sobre categoría(1). */
function rank(d: Descuento): number {
  const scope    = d.sucursal_id !== null ? 2 : 1
  const objetivo = d.objetivo === 'producto' ? 2 : 1
  return scope * 10 + objetivo
}

/**
 * Descuento efectivo para un ítem. La promo de catálogo manda y es read-only en
 * el mostrador: si algún descuento del catálogo matchea, gana (origen 'promo') y
 * el descuento manual se ignora. El manual solo aplica cuando no hay promo.
 * Dentro del catálogo: sucursal > global; producto > categoría. No acumula.
 */
export function resolverDescuento(
  item: DescuentoItemInput,
  manual_centavos: number | null,
  catalogo: Descuento[],
  ctx: DescuentoCtx = { fecha: new Date(), medio: null },
): DescuentoResuelto {
  const promo = catalogo
    .filter(d => d.activo && d.deleted_at === null && matchea(d, item) && promoVigente(d, ctx))
    .sort((a, b) => rank(b) - rank(a))[0]

  if (promo) {
    return {
      centavos: calcularDescuento(promo, item.subtotal_centavos),
      origen: 'promo',
      detalle: detalleDescuento(promo),
    }
  }

  if (manual_centavos !== null) {
    return { centavos: Math.max(0, Math.min(manual_centavos, item.subtotal_centavos)), origen: 'manual', detalle: null }
  }

  return { centavos: 0, origen: null, detalle: null }
}
