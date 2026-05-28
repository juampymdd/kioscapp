import type { SyncFields } from './sync'

export type CategoriaProducto =
  | 'cigarrillos'
  | 'bebidas'
  | 'golosinas'
  | 'kiosco'
  | 'recarga_sube'
  | 'recarga_celular'
  | 'varios'

export interface Producto extends SyncFields {
  codigo_barras: string | null
  descripcion: string
  categoria: CategoriaProducto
  /** Precio en centavos. NUNCA float. Ej: 1550 = $15,50. */
  precio_centavos: number
  /** true para productos a granel (golosinas, queso, etc.). */
  fraccionable: boolean
  /** 'unidad' | 'kg' | 'g' | 'l' | 'ml' */
  unidad_medida: string
  activo: boolean
}
