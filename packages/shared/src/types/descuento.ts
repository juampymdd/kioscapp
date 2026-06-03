import type { CategoriaProducto } from './producto'

export type ObjetivoDescuento = 'producto' | 'categoria' | 'todos'
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
  /** Días de semana en que aplica: CSV de 0-6 (0=Dom … 6=Sáb). null/'' = todos. */
  dias_semana?: string | null
  /** Vigencia (YYYY-MM-DD). null = sin límite. */
  vigencia_desde?: string | null
  vigencia_hasta?: string | null
  /** Franja horaria en minutos del día (0-1439). null = sin límite. */
  hora_desde?: number | null
  hora_hasta?: number | null
  /** Medio de pago requerido. null = cualquiera. */
  medio_pago?: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  /** Local (desktop): 'central' = vino del backend; 'local' = creada en la caja. */
  origen?: 'central' | 'local'
  /** Local (desktop): estado de sincronización de promos locales. */
  sync_status?: 'pending' | 'synced'
}
