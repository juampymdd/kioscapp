import type { SyncFields } from './sync'

/** Categoría de producto. Dato administrable (no enum). id = slug. */
export interface Categoria extends SyncFields {
  nombre: string
  /** Nombre del ícono lucide en PascalCase, ej 'Cigarette'. */
  icono: string
  color: string | null
  orden: number
  activo: boolean
}

/** Defaults sembrados al iniciar. id = slug (retrocompat con el enum viejo). */
export const CATEGORIAS_SEED: { id: string; nombre: string; icono: string; orden: number }[] = [
  { id: 'cigarrillos',     nombre: 'Cigarrillos', icono: 'Cigarette',   orden: 1 },
  { id: 'bebidas',         nombre: 'Bebidas',     icono: 'GlassWater',  orden: 2 },
  { id: 'golosinas',       nombre: 'Golosinas',   icono: 'Candy',       orden: 3 },
  { id: 'kiosco',          nombre: 'Kiosco',      icono: 'ShoppingBag', orden: 4 },
  { id: 'recarga_sube',    nombre: 'SUBE',        icono: 'Bus',         orden: 5 },
  { id: 'recarga_celular', nombre: 'Celular',     icono: 'Smartphone',  orden: 6 },
  { id: 'varios',          nombre: 'Varios',      icono: 'Package',     orden: 7 },
]
