import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function run() {
  console.log('Limpiando datos de test en puntos_venta...')
  await sql`DELETE FROM puntos_venta`

  console.log('Creando tabla sucursales...')
  await sql`
    CREATE TABLE IF NOT EXISTS sucursales (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id),
      nombre     TEXT NOT NULL,
      direccion  TEXT,
      ciudad     TEXT,
      provincia  TEXT,
      activo     BOOLEAN NOT NULL DEFAULT true,
      created_at TEXT NOT NULL
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_sucursales_user ON sucursales(user_id)`

  console.log('Modificando tabla puntos_venta...')
  await sql`ALTER TABLE puntos_venta DROP COLUMN IF EXISTS user_id`
  await sql`ALTER TABLE puntos_venta DROP COLUMN IF EXISTS direccion`
  await sql`ALTER TABLE puntos_venta DROP COLUMN IF EXISTS ciudad`
  await sql`ALTER TABLE puntos_venta DROP COLUMN IF EXISTS provincia`
  await sql`ALTER TABLE puntos_venta ADD COLUMN IF NOT EXISTS sucursal_id TEXT REFERENCES sucursales(id)`
  await sql`ALTER TABLE puntos_venta ALTER COLUMN sucursal_id SET NOT NULL`
  await sql`ALTER TABLE puntos_venta ALTER COLUMN nombre SET DEFAULT 'Caja'`
  await sql`DROP INDEX IF EXISTS idx_pv_user`
  await sql`CREATE INDEX IF NOT EXISTS idx_pv_sucursal ON puntos_venta(sucursal_id)`

  console.log('✓ Migración completada')
}

run().catch(e => { console.error(e); process.exit(1) })
