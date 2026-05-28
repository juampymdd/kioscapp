import Database from '@tauri-apps/plugin-sql'
import type {
  Producto, Venta, VentaItem, Caja, MovimientoCaja, Stock, Proveedor,
} from '@kioscapp/shared'
import type { DataStore } from './dataStore'
import { migrations } from '../lib/migrations'

type Row = Record<string, unknown>

function now(): string {
  return new Date().toISOString()
}

function bool(v: unknown): boolean {
  return v === 1 || v === true
}

function mapProducto(r: Row): Produto {
  return {
    id: r.id as string,
    codigo_barras: (r.codigo_barras as string | null) ?? null,
    descripcion: r.descripcion as string,
    categoria: r.categoria as Produto['categoria'],
    precio_centavos: r.precio_centavos as number,
    fraccionable: bool(r.fraccionable),
    unidad_medida: r.unidad_medida as string,
    activo: bool(r.activo),
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
    local_id: r.local_id as string,
    sync_status: r.sync_status as 'pending' | 'synced',
    deleted_at: (r.deleted_at as string | null) ?? null,
  }
}

function mapCaja(r: Row): Caja {
  return {
    id: r.id as string,
    usuario_id: (r.usuario_id as string | null) ?? null,
    apertura_at: r.apertura_at as string,
    cierre_at: (r.cierre_at as string | null) ?? null,
    monto_apertura_centavos: r.monto_apertura_centavos as number,
    monto_cierre_centavos: (r.monto_cierre_centavos as number | null) ?? null,
    estado: r.estado as Caja['estado'],
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
    local_id: r.local_id as string,
    sync_status: r.sync_status as 'pending' | 'synced',
    deleted_at: (r.deleted_at as string | null) ?? null,
  }
}

function mapStock(r: Row): Stock {
  return {
    id: r.id as string,
    producto_id: r.producto_id as string,
    cantidad: r.cantidad as number,
    alerta_minimo: r.alerta_minimo as number,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
    local_id: r.local_id as string,
    sync_status: r.sync_status as 'pending' | 'synced',
    deleted_at: (r.deleted_at as string | null) ?? null,
  }
}

function mapVenta(r: Row): Venta {
  return {
    id: r.id as string,
    created_at: r.created_at as string,
    local_id: r.local_id as string,
    sync_status: r.sync_status as 'pending' | 'synced',
    caja_id: r.caja_id as string,
    total_centavos: r.total_centavos as number,
    descuento_centavos: r.descuento_centavos as number,
    medio_pago: r.medio_pago as Venta['medio_pago'],
    monto_recibido_centavos: r.monto_recibido_centavos as number,
    vuelto_centavos: r.vuelto_centavos as number,
    anulada: bool(r.anulada),
    venta_anulacion_id: (r.venta_anulacion_id as string | null) ?? null,
  }
}

function mapMovimiento(r: Row): MovimientoCaja {
  return {
    id: r.id as string,
    caja_id: r.caja_id as string,
    tipo: r.tipo as MovimientoCaja['tipo'],
    monto_centavos: r.monto_centavos as number,
    descripcion: r.descripcion as string,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
    local_id: r.local_id as string,
    sync_status: r.sync_status as 'pending' | 'synced',
    deleted_at: (r.deleted_at as string | null) ?? null,
  }
}

// Alias: TypeScript no exporta 'Produto' — usamos Producto
type Produto = Producto

function mapProveedor(r: Row): Proveedor {
  return {
    id: r.id as string,
    nombre: r.nombre as string,
    telefono: (r.telefono as string | null) ?? null,
    email: (r.email as string | null) ?? null,
    notas: (r.notas as string | null) ?? null,
    activo: bool(r.activo),
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
    local_id: r.local_id as string,
    sync_status: r.sync_status as 'pending' | 'synced',
    deleted_at: (r.deleted_at as string | null) ?? null,
  }
}

function mapVentaItem(r: Row): VentaItem {
  return {
    id: r.id as string,
    created_at: r.created_at as string,
    local_id: r.local_id as string,
    sync_status: r.sync_status as 'pending' | 'synced',
    venta_id: r.venta_id as string,
    producto_id: r.producto_id as string,
    descripcion: r.descripcion as string,
    precio_unit_centavos: r.precio_unit_centavos as number,
    cantidad: r.cantidad as number,
    subtotal_centavos: r.subtotal_centavos as number,
  }
}

export class SqliteDataStore implements DataStore {
  db!: Database  // internal — accedido por syncEngine

  constructor(_localId: string) {
    // localId lo usa el código de presentación que crea los registros
  }

  async init(): Promise<void> {
    this.db = await Database.load('sqlite:kioscapp.db')
    // Aplicar migraciones acumuladas
    for (const m of migrations) {
      await this.db.execute(m.sql)
    }
  }

  // ── Productos ──────────────────────────────────────────────────────────────

  async getProductos(): Promise<Producto[]> {
    const rows = await this.db.select<Row[]>(
      `SELECT * FROM productos WHERE activo = 1 AND deleted_at IS NULL ORDER BY descripcion`,
    )
    return rows.map(mapProducto)
  }

  async getAllProductos(): Promise<Producto[]> {
    const rows = await this.db.select<Row[]>(
      `SELECT * FROM productos WHERE deleted_at IS NULL ORDER BY descripcion`,
    )
    return rows.map(mapProducto)
  }

  async getProductoPorBarcode(barcode: string): Promise<Producto | null> {
    const rows = await this.db.select<Row[]>(
      `SELECT * FROM productos WHERE codigo_barras = $1 AND activo = 1 AND deleted_at IS NULL LIMIT 1`,
      [barcode],
    )
    return rows.length ? mapProducto(rows[0]) : null
  }

  async getProductoPorId(id: string): Promise<Producto | null> {
    const rows = await this.db.select<Row[]>(
      `SELECT * FROM productos WHERE id = $1 LIMIT 1`,
      [id],
    )
    return rows.length ? mapProducto(rows[0]) : null
  }

  async upsertProducto(p: Producto): Promise<void> {
    await this.db.execute(
      `INSERT INTO productos
         (id, codigo_barras, descripcion, categoria, precio_centavos, fraccionable,
          unidad_medida, activo, created_at, updated_at, local_id, sync_status, deleted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT(id) DO UPDATE SET
         codigo_barras=excluded.codigo_barras,
         descripcion=excluded.descripcion,
         categoria=excluded.categoria,
         precio_centavos=excluded.precio_centavos,
         fraccionable=excluded.fraccionable,
         unidad_medida=excluded.unidad_medida,
         activo=excluded.activo,
         updated_at=excluded.updated_at,
         sync_status=excluded.sync_status,
         deleted_at=excluded.deleted_at`,
      [
        p.id, p.codigo_barras, p.descripcion, p.categoria,
        p.precio_centavos, p.fraccionable ? 1 : 0,
        p.unidad_medida, p.activo ? 1 : 0,
        p.created_at, p.updated_at, p.local_id, p.sync_status, p.deleted_at,
      ],
    )
  }

  // ── Ventas ─────────────────────────────────────────────────────────────────

  async crearVenta(venta: Omit<Venta, 'sync_status'>): Promise<void> {
    await this.db.execute(
      `INSERT INTO ventas
         (id, created_at, local_id, sync_status, caja_id, total_centavos,
          descuento_centavos, medio_pago, monto_recibido_centavos, vuelto_centavos,
          anulada, venta_anulacion_id)
       VALUES ($1,$2,$3,'pending',$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        venta.id, venta.created_at, venta.local_id, venta.caja_id,
        venta.total_centavos, venta.descuento_centavos, venta.medio_pago,
        venta.monto_recibido_centavos, venta.vuelto_centavos,
        venta.anulada ? 1 : 0, venta.venta_anulacion_id,
      ],
    )
  }

  async crearVentaItems(items: Omit<VentaItem, 'sync_status'>[]): Promise<void> {
    for (const item of items) {
      await this.db.execute(
        `INSERT INTO venta_items
           (id, created_at, local_id, sync_status, venta_id, producto_id,
            descripcion, precio_unit_centavos, cantidad, subtotal_centavos)
         VALUES ($1,$2,$3,'pending',$4,$5,$6,$7,$8,$9)`,
        [
          item.id, item.created_at, item.local_id, item.venta_id,
          item.producto_id, item.descripcion, item.precio_unit_centavos,
          item.cantidad, item.subtotal_centavos,
        ],
      )
    }
  }

  async getVentasRango(desde: string, hasta: string): Promise<Venta[]> {
    const rows = await this.db.select<Row[]>(
      `SELECT * FROM ventas WHERE created_at >= $1 AND created_at < $2 AND anulada=0 ORDER BY created_at DESC`,
      [desde, hasta],
    )
    return rows.map(mapVenta)
  }

  async getVentaItemsPorVenta(ventaId: string): Promise<VentaItem[]> {
    const rows = await this.db.select<Row[]>(
      `SELECT * FROM venta_items WHERE venta_id=$1`,
      [ventaId],
    )
    return rows.map(mapVentaItem)
  }

  async getVentasDia(fechaISO: string): Promise<Venta[]> {
    const dia = fechaISO.slice(0, 10)
    const rows = await this.db.select<Row[]>(
      `SELECT * FROM ventas WHERE created_at LIKE $1 ORDER BY created_at DESC`,
      [`${dia}%`],
    )
    return rows.map(mapVenta)
  }

  // ── Caja ───────────────────────────────────────────────────────────────────

  async abrirCaja(caja: Omit<Caja, 'sync_status'>): Promise<void> {
    await this.db.execute(
      `INSERT INTO cajas
         (id, usuario_id, apertura_at, cierre_at, monto_apertura_centavos,
          monto_cierre_centavos, estado, created_at, updated_at, local_id, sync_status, deleted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',$11)`,
      [
        caja.id, caja.usuario_id, caja.apertura_at, caja.cierre_at,
        caja.monto_apertura_centavos, caja.monto_cierre_centavos,
        caja.estado, caja.created_at, caja.updated_at, caja.local_id, caja.deleted_at,
      ],
    )
  }

  async cerrarCaja(cajaId: string, montoCierreCentavos: number): Promise<void> {
    const ts = now()
    await this.db.execute(
      `UPDATE cajas
       SET estado='cerrada', cierre_at=$1, monto_cierre_centavos=$2,
           updated_at=$3, sync_status='pending'
       WHERE id=$4`,
      [ts, montoCierreCentavos, ts, cajaId],
    )
  }

  async getCajaActiva(): Promise<Caja | null> {
    const rows = await this.db.select<Row[]>(
      `SELECT * FROM cajas WHERE estado='abierta' AND deleted_at IS NULL ORDER BY apertura_at DESC LIMIT 1`,
    )
    return rows.length ? mapCaja(rows[0]) : null
  }

  async registrarMovimientoCaja(mov: Omit<MovimientoCaja, 'sync_status'>): Promise<void> {
    await this.db.execute(
      `INSERT INTO movimientos_caja
         (id, caja_id, tipo, monto_centavos, descripcion,
          created_at, updated_at, local_id, sync_status, deleted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9)`,
      [
        mov.id, mov.caja_id, mov.tipo, mov.monto_centavos, mov.descripcion,
        mov.created_at, mov.updated_at, mov.local_id, mov.deleted_at,
      ],
    )
  }

  async getMovimientosCaja(cajaId: string): Promise<MovimientoCaja[]> {
    const rows = await this.db.select<Row[]>(
      `SELECT * FROM movimientos_caja WHERE caja_id=$1 ORDER BY created_at`,
      [cajaId],
    )
    return rows.map(mapMovimiento)
  }

  // ── Stock ──────────────────────────────────────────────────────────────────

  async getStock(productoId: string): Promise<Stock | null> {
    const rows = await this.db.select<Row[]>(
      `SELECT * FROM stock WHERE producto_id=$1 AND deleted_at IS NULL LIMIT 1`,
      [productoId],
    )
    return rows.length ? mapStock(rows[0]) : null
  }

  async setStock(productoId: string, cantidad: number, alertaMinimo: number): Promise<void> {
    const ts = now()
    const localId = import.meta.env.VITE_LOCAL_ID ?? 'local-demo'
    await this.db.execute(
      `INSERT INTO stock (id, producto_id, cantidad, alerta_minimo, created_at, updated_at, local_id, sync_status)
       VALUES ($1,$2,$3,$4,$5,$5,$6,'pending')
       ON CONFLICT(producto_id) DO UPDATE SET
         cantidad=excluded.cantidad, alerta_minimo=excluded.alerta_minimo,
         updated_at=excluded.updated_at, sync_status='pending'`,
      [crypto.randomUUID(), productoId, cantidad, alertaMinimo, ts, localId],
    )
  }

  async getProductosConStock(): Promise<Array<{ producto: Producto; stock: Stock | null }>> {
    const rows = await this.db.select<Row[]>(
      `SELECT p.*,
              s.id as s_id, s.cantidad, s.alerta_minimo,
              s.created_at as s_created_at, s.updated_at as s_updated_at,
              s.local_id as s_local_id, s.sync_status as s_sync_status,
              s.deleted_at as s_deleted_at
       FROM productos p
       LEFT JOIN stock s ON s.producto_id = p.id AND s.deleted_at IS NULL
       WHERE p.deleted_at IS NULL
       ORDER BY p.descripcion`,
    )
    return rows.map(r => ({
      producto: mapProducto(r),
      stock: r.s_id ? {
        id: r.s_id as string,
        producto_id: r.id as string,
        cantidad: r.cantidad as number,
        alerta_minimo: r.alerta_minimo as number,
        created_at: r.s_created_at as string,
        updated_at: r.s_updated_at as string,
        local_id: r.s_local_id as string,
        sync_status: r.s_sync_status as 'pending' | 'synced',
        deleted_at: (r.s_deleted_at as string | null) ?? null,
      } : null,
    }))
  }

  async decrementarStock(productoId: string, cantidad: number): Promise<void> {
    const ts = now()
    await this.db.execute(
      `UPDATE stock SET cantidad = cantidad - $1, updated_at=$2, sync_status='pending'
       WHERE producto_id=$3 AND deleted_at IS NULL`,
      [cantidad, ts, productoId],
    )
  }

  async getProductosBajoStock(): Promise<Array<{ producto: Producto; stock: Stock }>> {
    const rows = await this.db.select<Row[]>(
      `SELECT p.*, s.id as s_id, s.producto_id, s.cantidad, s.alerta_minimo,
              s.created_at as s_created_at, s.updated_at as s_updated_at,
              s.local_id as s_local_id, s.sync_status as s_sync_status,
              s.deleted_at as s_deleted_at
       FROM stock s
       JOIN productos p ON p.id = s.producto_id
       WHERE s.cantidad <= s.alerta_minimo
         AND s.deleted_at IS NULL
         AND p.activo = 1
         AND p.deleted_at IS NULL`,
    )
    return rows.map(r => ({
      producto: mapProducto(r),
      stock: {
        id: r.s_id as string,
        producto_id: r.producto_id as string,
        cantidad: r.cantidad as number,
        alerta_minimo: r.alerta_minimo as number,
        created_at: r.s_created_at as string,
        updated_at: r.s_updated_at as string,
        local_id: r.s_local_id as string,
        sync_status: r.s_sync_status as 'pending' | 'synced',
        deleted_at: (r.s_deleted_at as string | null) ?? null,
      },
    }))
  }

  // ── Proveedores ────────────────────────────────────────────────────────────

  async getProveedores(): Promise<Proveedor[]> {
    const rows = await this.db.select<Row[]>(
      `SELECT * FROM proveedores WHERE activo=1 AND deleted_at IS NULL ORDER BY nombre`,
    )
    return rows.map(mapProveedor)
  }

  async upsertProveedor(p: Proveedor): Promise<void> {
    await this.db.execute(
      `INSERT INTO proveedores
         (id, nombre, telefono, email, notas, activo, created_at, updated_at, local_id, sync_status, deleted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10)
       ON CONFLICT(id) DO UPDATE SET
         nombre=excluded.nombre, telefono=excluded.telefono, email=excluded.email,
         notas=excluded.notas, activo=excluded.activo,
         updated_at=excluded.updated_at, sync_status='pending',
         deleted_at=excluded.deleted_at`,
      [p.id, p.nombre, p.telefono, p.email, p.notas, p.activo ? 1 : 0,
       p.created_at, p.updated_at, p.local_id, p.deleted_at],
    )
  }

  async deleteProveedor(id: string): Promise<void> {
    const ts = now()
    await this.db.execute(
      `UPDATE proveedores SET deleted_at=$1, activo=0, updated_at=$2, sync_status='pending' WHERE id=$3`,
      [ts, ts, id],
    )
  }

  // ── Sync ───────────────────────────────────────────────────────────────────

  async getPendientesSincronizacion(): Promise<Array<{ tabla: string; ids: string[] }>> {
    const tablas = ['productos', 'stock', 'cajas', 'ventas', 'venta_items', 'movimientos_caja']
    const result: Array<{ tabla: string; ids: string[] }> = []
    for (const tabla of tablas) {
      const rows = await this.db.select<{ id: string }[]>(
        `SELECT id FROM ${tabla} WHERE sync_status='pending'`,
      )
      if (rows.length) result.push({ tabla, ids: rows.map(r => r.id) })
    }
    return result
  }

  async marcarSincronizado(tabla: string, ids: string[]): Promise<void> {
    if (!ids.length) return
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',')
    await this.db.execute(
      `UPDATE ${tabla} SET sync_status='synced' WHERE id IN (${placeholders})`,
      ids,
    )
  }
}
