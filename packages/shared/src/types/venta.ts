import type { SyncStatus } from './sync'

export type MedioPago =
  | 'efectivo'
  | 'debito'
  | 'credito'
  | 'qr_mercado_pago'
  | 'cuenta_corriente'  // fiado

/**
 * Venta append-only: sin updated_at ni deleted_at.
 * Los errores se corrigen con una venta de anulación, nunca editando.
 */
export interface Venta {
  id: string            // UUID v4
  created_at: string    // ISO8601 UTC — momento de la venta
  local_id: string
  sync_status: SyncStatus
  caja_id: string
  /** Monto total final en centavos (ya aplicado el descuento). */
  total_centavos: number
  descuento_centavos: number
  medio_pago: MedioPago
  /** Solo relevante para efectivo; 0 en pagos electrónicos. */
  monto_recibido_centavos: number
  vuelto_centavos: number
  anulada: boolean
  /** Si esta venta anula a otra, apunta al id de la venta original. */
  venta_anulacion_id: string | null
}

/**
 * Ítem de venta con datos "congelados" al momento de vender.
 * Guardar descripcion y precio_unit_centavos propios protege contra
 * cambios posteriores en el catálogo de productos.
 */
export interface VentaItem {
  id: string
  created_at: string
  local_id: string
  sync_status: SyncStatus
  venta_id: string
  producto_id: string
  descripcion: string           // copiado del producto al vender
  precio_unit_centavos: number  // copiado del producto al vender
  /** REAL: permite fracciones para productos a granel. */
  cantidad: number
  subtotal_centavos: number     // floor(precio_unit * cantidad)
}
