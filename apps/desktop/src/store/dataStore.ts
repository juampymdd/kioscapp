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
import type { Proveedor } from '@kioscapp/shared'
import type { Descuento } from '@kioscapp/shared'
import type { Categoria } from '@kioscapp/shared'
import type { ProductoProveedor, Pedido, PedidoItem } from '@kioscapp/shared'

/** Fila de reposición: producto con stock bajo + un proveedor que lo provee. */
export interface FilaReposicion {
  producto: Producto
  stock: Stock
  proveedor: Proveedor
  costo_centavos: number
}

export interface DataStore {
  // ── Productos ─────────────────────────────────────────────────────────────
  getProductos(): Promise<Producto[]>
  getAllProductos(): Promise<Producto[]>
  getProductoPorBarcode(barcode: string): Promise<Producto | null>
  getProductoPorId(id: string): Promise<Producto | null>
  upsertProducto(p: Producto): Promise<void>
  reemplazarPreciosSucursal(lista: { producto_id: string; precio_centavos: number }[]): Promise<void>

  // ── Ventas (append-only) ──────────────────────────────────────────────────
  crearVenta(venta: Omit<Venta, 'sync_status'>): Promise<void>
  crearVentaItems(items: Omit<VentaItem, 'sync_status'>[]): Promise<void>
  getVentasDia(fechaISO: string): Promise<Venta[]>
  getVentasRango(desde: string, hasta: string): Promise<Venta[]>
  getVentaItemsPorVenta(ventaId: string): Promise<VentaItem[]>

  // ── Caja / Turno ──────────────────────────────────────────────────────────
  abrirCaja(caja: Omit<Caja, 'sync_status'>): Promise<void>
  cerrarCaja(cajaId: string, montoCierreCentavos: number): Promise<void>
  getCajaActiva(): Promise<Caja | null>
  registrarMovimientoCaja(mov: Omit<MovimientoCaja, 'sync_status'>): Promise<void>
  getMovimientosCaja(cajaId: string): Promise<MovimientoCaja[]>

  // ── Stock ─────────────────────────────────────────────────────────────────
  getStock(productoId: string): Promise<Stock | null>
  decrementarStock(productoId: string, cantidad: number): Promise<void>
  setStock(productoId: string, cantidad: number, alertaMinimo: number): Promise<void>
  getProductosBajoStock(): Promise<Array<{ producto: Producto; stock: Stock }>>
  getProductosConStock(): Promise<Array<{ producto: Producto; stock: Stock | null }>>

  // ── Proveedores ───────────────────────────────────────────────────────────
  getProveedores(): Promise<Proveedor[]>
  upsertProveedor(p: Proveedor): Promise<void>
  deleteProveedor(id: string): Promise<void>

  // ── Compras: vínculo producto↔proveedor + pedidos ──────────────────────────
  getProveedoresDeProducto(productoId: string): Promise<ProductoProveedor[]>
  setProveedoresDeProducto(productoId: string, vinculos: Array<{ proveedor_id: string; costo_centavos: number }>): Promise<void>
  getReposicion(): Promise<FilaReposicion[]>
  incrementarStock(productoId: string, cantidad: number): Promise<void>
  crearPedido(pedido: Omit<Pedido, 'sync_status'>, items: Omit<PedidoItem, 'sync_status'>[]): Promise<void>
  getPedidos(): Promise<Pedido[]>
  getPedidoItems(pedidoId: string): Promise<PedidoItem[]>
  marcarPedidoRecibido(pedidoId: string): Promise<void>

  // ── Config local ─────────────────────────────────────────────────────────
  getConfig(key: string): Promise<string | null>
  setConfig(key: string, value: string): Promise<void>

  // ── Descuentos (catálogo central + promos locales) ─────────────────────────
  upsertDescuento(d: Descuento): Promise<void>
  getDescuentosActivos(): Promise<Descuento[]>
  getDescuentos(): Promise<Descuento[]>
  getDescuentosPendientes(): Promise<Descuento[]>
  marcarDescuentoSincronizado(id: string): Promise<void>
  setDescuentoActivo(id: string, activo: boolean): Promise<void>
  eliminarDescuentoLocal(id: string): Promise<void>
  reconciliarDescuentosCentral(idsVigentes: string[]): Promise<void>

  // ── Categorías ─────────────────────────────────────────────────────────────
  getCategorias(): Promise<Categoria[]>
  getAllCategorias(): Promise<Categoria[]>
  upsertCategoria(c: Categoria): Promise<void>
  eliminarCategoria(id: string): Promise<void>

  // ── Sincronización ────────────────────────────────────────────────────────
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
