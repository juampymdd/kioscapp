/**
 * Migraciones SQLite para la app local.
 * Se ejecutan en orden al iniciar la app via Database.load() con el array de
 * migrations. tauri-plugin-sql aplica solo las que todavía no corrieron,
 * guardando el estado en una tabla interna.
 */
export const migrations = [
  {
    description: 'Crear esquema inicial — Fase 1',
    sql: `
      CREATE TABLE IF NOT EXISTS productos (
        id                 TEXT PRIMARY KEY,
        codigo_barras      TEXT,
        descripcion        TEXT NOT NULL,
        categoria          TEXT NOT NULL,
        precio_centavos    INTEGER NOT NULL,
        fraccionable       INTEGER NOT NULL DEFAULT 0,
        unidad_medida      TEXT NOT NULL DEFAULT 'unidad',
        activo             INTEGER NOT NULL DEFAULT 1,
        created_at         TEXT NOT NULL,
        updated_at         TEXT NOT NULL,
        local_id           TEXT NOT NULL,
        sync_status        TEXT NOT NULL DEFAULT 'pending',
        deleted_at         TEXT
      );

      CREATE TABLE IF NOT EXISTS stock (
        id                 TEXT PRIMARY KEY,
        producto_id        TEXT NOT NULL REFERENCES productos(id),
        cantidad           REAL NOT NULL DEFAULT 0,
        alerta_minimo      REAL NOT NULL DEFAULT 5,
        created_at         TEXT NOT NULL,
        updated_at         TEXT NOT NULL,
        local_id           TEXT NOT NULL,
        sync_status        TEXT NOT NULL DEFAULT 'pending',
        deleted_at         TEXT
      );

      CREATE TABLE IF NOT EXISTS cajas (
        id                          TEXT PRIMARY KEY,
        usuario_id                  TEXT,
        apertura_at                 TEXT NOT NULL,
        cierre_at                   TEXT,
        monto_apertura_centavos     INTEGER NOT NULL,
        monto_cierre_centavos       INTEGER,
        estado                      TEXT NOT NULL DEFAULT 'abierta',
        created_at                  TEXT NOT NULL,
        updated_at                  TEXT NOT NULL,
        local_id                    TEXT NOT NULL,
        sync_status                 TEXT NOT NULL DEFAULT 'pending',
        deleted_at                  TEXT
      );

      CREATE TABLE IF NOT EXISTS ventas (
        id                          TEXT PRIMARY KEY,
        created_at                  TEXT NOT NULL,
        local_id                    TEXT NOT NULL,
        sync_status                 TEXT NOT NULL DEFAULT 'pending',
        caja_id                     TEXT NOT NULL,
        total_centavos              INTEGER NOT NULL,
        descuento_centavos          INTEGER NOT NULL DEFAULT 0,
        medio_pago                  TEXT NOT NULL,
        monto_recibido_centavos     INTEGER NOT NULL DEFAULT 0,
        vuelto_centavos             INTEGER NOT NULL DEFAULT 0,
        anulada                     INTEGER NOT NULL DEFAULT 0,
        venta_anulacion_id          TEXT
      );

      CREATE TABLE IF NOT EXISTS venta_items (
        id                    TEXT PRIMARY KEY,
        created_at            TEXT NOT NULL,
        local_id              TEXT NOT NULL,
        sync_status           TEXT NOT NULL DEFAULT 'pending',
        venta_id              TEXT NOT NULL,
        producto_id           TEXT NOT NULL,
        descripcion           TEXT NOT NULL,
        precio_unit_centavos  INTEGER NOT NULL,
        cantidad              REAL NOT NULL,
        subtotal_centavos     INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS movimientos_caja (
        id              TEXT PRIMARY KEY,
        caja_id         TEXT NOT NULL,
        tipo            TEXT NOT NULL,
        monto_centavos  INTEGER NOT NULL,
        descripcion     TEXT NOT NULL,
        created_at      TEXT NOT NULL,
        updated_at      TEXT NOT NULL,
        local_id        TEXT NOT NULL,
        sync_status     TEXT NOT NULL DEFAULT 'pending',
        deleted_at      TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_productos_barcode  ON productos(codigo_barras) WHERE codigo_barras IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_productos_activo   ON productos(activo);
      CREATE INDEX IF NOT EXISTS idx_stock_producto     ON stock(producto_id);
      CREATE INDEX IF NOT EXISTS idx_ventas_caja        ON ventas(caja_id);
      CREATE INDEX IF NOT EXISTS idx_ventas_created     ON ventas(created_at);
      CREATE INDEX IF NOT EXISTS idx_venta_items_venta  ON venta_items(venta_id);
      CREATE INDEX IF NOT EXISTS idx_movimientos_caja   ON movimientos_caja(caja_id);
    `,
  },
  {
    description: 'Tabla config local — Fase 2b',
    sql: `
      CREATE TABLE IF NOT EXISTS config (
        key    TEXT PRIMARY KEY,
        value  TEXT NOT NULL
      );
    `,
  },
  {
    description: 'venta_items: categoria + descuento congelados — Fase 3',
    sql: `
      ALTER TABLE venta_items ADD COLUMN categoria TEXT NOT NULL DEFAULT 'varios';
      ALTER TABLE venta_items ADD COLUMN descuento_centavos INTEGER NOT NULL DEFAULT 0;
    `,
  },
  {
    description: 'Tabla proveedores — Fase 2',
    sql: `
      CREATE TABLE IF NOT EXISTS proveedores (
        id           TEXT PRIMARY KEY,
        nombre       TEXT NOT NULL,
        telefono     TEXT,
        email        TEXT,
        notas        TEXT,
        activo       INTEGER NOT NULL DEFAULT 1,
        created_at   TEXT NOT NULL,
        updated_at   TEXT NOT NULL,
        local_id     TEXT NOT NULL,
        sync_status  TEXT NOT NULL DEFAULT 'pending',
        deleted_at   TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_proveedores_activo ON proveedores(activo);
    `,
  },
  {
    description: 'Tabla descuentos local — Fase 3',
    sql: `
      CREATE TABLE IF NOT EXISTS descuentos (
        id           TEXT PRIMARY KEY,
        user_id      TEXT NOT NULL DEFAULT '',
        sucursal_id  TEXT,
        objetivo     TEXT NOT NULL,
        producto_id  TEXT,
        categoria    TEXT,
        tipo         TEXT NOT NULL,
        valor        INTEGER NOT NULL,
        activo       INTEGER NOT NULL DEFAULT 1,
        created_at   TEXT NOT NULL DEFAULT '',
        updated_at   TEXT NOT NULL DEFAULT '',
        deleted_at   TEXT
      );
    `,
  },
  {
    description: 'venta_items: origen del descuento congelado — Fase 3',
    sql: `
      ALTER TABLE venta_items ADD COLUMN descuento_origen TEXT;
    `,
  },
  {
    description: 'descuentos: origen (central/local) + sync_status — Fase 3',
    sql: `
      ALTER TABLE descuentos ADD COLUMN origen TEXT NOT NULL DEFAULT 'central';
      ALTER TABLE descuentos ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
    `,
  },
]
