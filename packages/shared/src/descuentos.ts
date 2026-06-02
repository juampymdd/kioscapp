import type { CategoriaProducto } from './types/producto'
import type { Descuento } from './types/descuento'

export interface DescuentoItemInput {
  producto_id: string
  categoria: CategoriaProducto
  subtotal_centavos: number
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

/** Rank de prioridad: sucursal(2) sobre global(1); producto(2) sobre categoría(1). */
function rank(d: Descuento): number {
  const scope    = d.sucursal_id !== null ? 2 : 1
  const objetivo = d.objetivo === 'producto' ? 2 : 1
  return scope * 10 + objetivo
}

/**
 * Descuento efectivo en centavos para un ítem. Gana uno solo (no acumula):
 * manual > sucursal > global; dentro de cada scope, producto > categoría.
 * El catálogo ya viene scopeado (global del dueño + esta sucursal).
 */
export function resolverDescuentoItem(
  item: DescuentoItemInput,
  manual_centavos: number | null,
  catalogo: Descuento[],
): number {
  if (manual_centavos !== null) {
    return Math.max(0, Math.min(manual_centavos, item.subtotal_centavos))
  }

  const candidatos = catalogo
    .filter(d => d.activo && d.deleted_at === null && matchea(d, item))
    .sort((a, b) => rank(b) - rank(a))

  if (candidatos.length === 0) return 0
  return calcularDescuento(candidatos[0], item.subtotal_centavos)
}
