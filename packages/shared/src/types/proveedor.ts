import type { SyncFields } from './sync'

export interface Proveedor extends SyncFields {
  nombre: string
  telefono: string | null
  email: string | null
  notas: string | null
  activo: boolean
}
