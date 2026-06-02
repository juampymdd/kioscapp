import type { CategoriaProducto } from './producto'

export type ObjetivoDescuento = 'producto' | 'categoria'
export type TipoDescuento = 'monto' | 'porcentaje'

/**
 * Descuento de catálogo. sucursal_id NULL = global (aplica a todas las sucursales
 * del dueño). valor: si tipo='monto' son centavos; si tipo='porcentaje' es entero 1..100.
 */
export interface Descuento {
  id: string
  user_id: string
  sucursal_id: string | null
  objetivo: ObjetivoDescuento
  producto_id: string | null
  categoria: CategoriaProducto | null
  tipo: TipoDescuento
  valor: number
  activo: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
  /** Local (desktop): 'central' = vino del backend; 'local' = creada en la caja. */
  origen?: 'central' | 'local'
  /** Local (desktop): estado de sincronización de promos locales. */
  sync_status?: 'pending' | 'synced'
}
