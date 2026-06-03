import type { SyncFields } from './sync'

/**
 * Vínculo producto ↔ proveedor con el costo de ESE proveedor (centavos).
 * Muchos-a-muchos: un producto puede venir de varios proveedores y cada uno
 * con su propio costo (para comparar quién es más barato).
 */
export interface ProductoProveedor extends SyncFields {
  producto_id: string
  proveedor_id: string
  /** Costo en centavos. NUNCA float. */
  costo_centavos: number
}
