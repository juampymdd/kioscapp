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
): DescuentoResuelto {
  const promo = catalogo
    .filter(d => d.activo && d.deleted_at === null && matchea(d, item))
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
