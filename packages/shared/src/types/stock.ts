import type { SyncFields } from './sync'

/** Stock de un producto en un local específico. */
export interface Stock extends SyncFields {
  producto_id: string
  /** REAL: permite fracciones para productos a granel. */
  cantidad: number
  /** Disparar alerta cuando cantidad <= alerta_minimo. */
  alerta_minimo: number
}
