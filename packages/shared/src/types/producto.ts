import type { SyncFields } from './sync'

/** Id de categoría (slug). Antes era una unión fija; ahora las categorías son dato. */
export type CategoriaProducto = string

// Derivados del seed — solo fallback/compat. La fuente de verdad es la tabla `categorias`.
import { CATEGORIAS_SEED } from './categoria'

/** Etiqueta por defecto de las categorías sembradas (fallback). */
export const CATEGORIA_LABEL: Record<string, string> =
  Object.fromEntries(CATEGORIAS_SEED.map(c => [c.id, c.nombre]))

/** Orden por defecto de las categorías sembradas (fallback). */
export const CATEGORIA_ORDEN: string[] = CATEGORIAS_SEED.map(c => c.id)

export interface Producto extends SyncFields {
  codigo_barras: string | null
  descripcion: string
  categoria: CategoriaProducto
  /** Precio en centavos. NUNCA float. Ej: 1550 = $15,50. */
  precio_centavos: number
  /** true para productos a granel (golosinas, queso, etc.). */
  fraccionable: boolean
  /**
   * true = el precio se ingresa al vender (recargas SUBE, celular, etc.).
   * En ese caso precio_centavos es solo una sugerencia/0; el monto real lo
   * tipea el cajero en el momento.
   */
  precio_variable: boolean
  /** 'unidad' | 'kg' | 'g' | 'l' | 'ml' */
  unidad_medida: string
  activo: boolean
}
