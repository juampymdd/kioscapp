import type { SyncFields } from './sync'

export type EstadoPedido = 'pendiente' | 'recibido'

/** Pedido (orden de compra) a un proveedor. */
export interface Pedido extends SyncFields {
  proveedor_id: string
  estado: EstadoPedido
  /** Total en centavos (Σ subtotales de los ítems). */
  total_centavos: number
  /** Fecha en que se marcó recibido (ISO). null mientras está pendiente. */
  recibido_at: string | null
}

/** Ítem de un pedido. Append-only; guarda snapshots (descripción y costo al pedir). */
export interface PedidoItem {
  id: string
  created_at: string
  local_id: string
  sync_status: 'pending' | 'synced'
  pedido_id: string
  producto_id: string
  descripcion: string
  cantidad: number
  costo_unit_centavos: number
  subtotal_centavos: number
}
