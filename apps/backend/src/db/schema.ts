import {
  pgTable, text, integer, real, boolean, index,
} from 'drizzle-orm/pg-core'

// Campos de sincronización comunes — composición manual (Drizzle no tiene mixins)
const syncFields = {
  id:          text('id').primaryKey(),
  local_id:    text('local_id').notNull(),
  sync_status: text('sync_status', { enum: ['pending', 'synced'] }).notNull().default('synced'),
  created_at:  text('created_at').notNull(),
  updated_at:  text('updated_at').notNull(),
  deleted_at:  text('deleted_at'),
}

export const productos = pgTable('productos', {
  ...syncFields,
  codigo_barras:   text('codigo_barras'),
  descripcion:     text('descripcion').notNull(),
  categoria:       text('categoria').notNull(),
  precio_centavos: integer('precio_centavos').notNull(),
  fraccionable:    boolean('fraccionable').notNull().default(false),
  unidad_medida:   text('unidad_medida').notNull().default('unidad'),
  activo:          boolean('activo').notNull().default(true),
}, t => [
  index('idx_productos_barcode').on(t.codigo_barras),
  index('idx_productos_local').on(t.local_id),
])

export const stock = pgTable('stock', {
  ...syncFields,
  producto_id:   text('producto_id').notNull().references(() => productos.id),
  cantidad:      real('cantidad').notNull().default(0),
  alerta_minimo: real('alerta_minimo').notNull().default(5),
}, t => [
  index('idx_stock_producto').on(t.producto_id),
])

export const cajas = pgTable('cajas', {
  ...syncFields,
  usuario_id:               text('usuario_id'),
  apertura_at:              text('apertura_at').notNull(),
  cierre_at:                text('cierre_at'),
  monto_apertura_centavos:  integer('monto_apertura_centavos').notNull(),
  monto_cierre_centavos:    integer('monto_cierre_centavos'),
  estado:                   text('estado', { enum: ['abierta', 'cerrada'] }).notNull().default('abierta'),
}, t => [
  index('idx_cajas_local').on(t.local_id),
])

// Ventas: append-only — sin updated_at ni deleted_at
export const ventas = pgTable('ventas', {
  id:                         text('id').primaryKey(),
  created_at:                 text('created_at').notNull(),
  local_id:                   text('local_id').notNull(),
  sync_status:                text('sync_status', { enum: ['pending', 'synced'] }).notNull().default('synced'),
  caja_id:                    text('caja_id').notNull(),
  total_centavos:             integer('total_centavos').notNull(),
  descuento_centavos:         integer('descuento_centavos').notNull().default(0),
  medio_pago:                 text('medio_pago').notNull(),
  monto_recibido_centavos:    integer('monto_recibido_centavos').notNull().default(0),
  vuelto_centavos:            integer('vuelto_centavos').notNull().default(0),
  anulada:                    boolean('anulada').notNull().default(false),
  venta_anulacion_id:         text('venta_anulacion_id'),
}, t => [
  index('idx_ventas_caja').on(t.caja_id),
  index('idx_ventas_local').on(t.local_id),
  index('idx_ventas_created').on(t.created_at),
])

export const venta_items = pgTable('venta_items', {
  id:                   text('id').primaryKey(),
  created_at:           text('created_at').notNull(),
  local_id:             text('local_id').notNull(),
  sync_status:          text('sync_status', { enum: ['pending', 'synced'] }).notNull().default('synced'),
  venta_id:             text('venta_id').notNull().references(() => ventas.id),
  producto_id:          text('producto_id').notNull(),
  descripcion:          text('descripcion').notNull(),
  precio_unit_centavos: integer('precio_unit_centavos').notNull(),
  cantidad:             real('cantidad').notNull(),
  subtotal_centavos:    integer('subtotal_centavos').notNull(),
}, t => [
  index('idx_venta_items_venta').on(t.venta_id),
])

export const movimientos_caja = pgTable('movimientos_caja', {
  ...syncFields,
  caja_id:        text('caja_id').notNull(),
  tipo:           text('tipo').notNull(),
  monto_centavos: integer('monto_centavos').notNull(),
  descripcion:    text('descripcion').notNull(),
}, t => [
  index('idx_movimientos_caja').on(t.caja_id),
])

export const proveedores = pgTable('proveedores', {
  ...syncFields,
  nombre:   text('nombre').notNull(),
  telefono: text('telefono'),
  email:    text('email'),
  notas:    text('notas'),
  activo:   boolean('activo').notNull().default(true),
}, t => [
  index('idx_proveedores_local').on(t.local_id),
])

// Platform tables — not synced from desktop, managed via web dashboard

export const users = pgTable('users', {
  id:            text('id').primaryKey(),
  email:         text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  nombre:        text('nombre').notNull(),
  created_at:    text('created_at').notNull(),
})

// Sucursal = physical location (store). One user can have many.
export const sucursales = pgTable('sucursales', {
  id:         text('id').primaryKey(),
  user_id:    text('user_id').notNull().references(() => users.id),
  nombre:     text('nombre').notNull(),
  direccion:  text('direccion'),
  ciudad:     text('ciudad'),
  provincia:  text('provincia'),
  activo:     boolean('activo').notNull().default(true),
  created_at: text('created_at').notNull(),
}, t => [index('idx_sucursales_user').on(t.user_id)])

// Punto de venta = a single cash register / desktop instance inside a sucursal.
// Its id IS the local_id used by the desktop app for sync.
export const puntos_venta = pgTable('puntos_venta', {
  id:          text('id').primaryKey(),
  sucursal_id: text('sucursal_id').notNull().references(() => sucursales.id),
  nombre:      text('nombre').notNull().default('Caja'),
  sync_secret: text('sync_secret').notNull(),
  activo:      boolean('activo').notNull().default(true),
  created_at:  text('created_at').notNull(),
}, t => [index('idx_pv_sucursal').on(t.sucursal_id)])
