/**
 * Interfaz abstracta para TODO acceso a datos locales.
 *
 * Los componentes React NUNCA tocan SQL directamente — solo usan este contrato.
 * La implementación concreta (SqliteDataStore) se agrega en Fase 1 usando
 * @tauri-apps/plugin-sql. Esto permite testear la UI con una implementación
 * en memoria sin dependencia de Tauri.
 */

import type { Producto } from '@kioscapp/shared'
import type { Venta, VentaItem } from '@kioscapp/shared'
import type { Caja, MovimientoCaja } from '@kioscapp/shared'
import type { Stock } from '@kioscapp/shared'

export interface DataStore {
  // ── Productos ─────────────────────────────────────────────────────────────
  getProductos(): Promise<Producto[]>
  getProductoPorBarcode(barcode: string): Promise<Producto | null>
  getProductoPorId(id: string): Promise<Producto | null>

  // ── Ventas (append-only) ──────────────────────────────────────────────────
  crearVenta(venta: Omit<Venta, 'sync_status'>): Promise<void>
  crearVentaItems(items: Omit<VentaItem, 'sync_status'>[]): Promise<void>
  getVentasDia(fechaISO: string): Promise<Venta[]>

  // ── Caja / Turno ──────────────────────────────────────────────────────────
  abrirCaja(caja: Omit<Caja, 'sync_status'>): Promise<void>
  cerrarCaja(cajaId: string, montoCierreCentavos: number): Promise<void>
  getCajaActiva(): Promise<Caja | null>
  registrarMovimientoCaja(mov: Omit<MovimientoCaja, 'sync_status'>): Promise<void>
  getMovimientosCaja(cajaId: string): Promise<MovimientoCaja[]>

  // ── Stock ─────────────────────────────────────────────────────────────────
  getStock(productoId: string): Promise<Stock | null>
  decrementarStock(productoId: string, cantidad: number): Promise<void>
  /** Devuelve productos cuyo stock actual <= alerta_minimo. */
  getProductosBajoStock(): Promise<Array<{ producto: Producto; stock: Stock }>>

  // ── Sincronización (se implementa en Fase 3) ──────────────────────────────
  getPendientesSincronizacion(): Promise<Array<{ tabla: string; ids: string[] }>>
  marcarSincronizado(tabla: string, ids: string[]): Promise<void>
}

/** Singleton del store activo. Se asigna en el bootstrap (main.tsx). */
let _store: DataStore | null = null

export function setDataStore(store: DataStore): void {
  _store = store
}

export function getDataStore(): DataStore {
  if (!_store) throw new Error('DataStore no inicializado. Llamar setDataStore() en el bootstrap.')
  return _store
}
