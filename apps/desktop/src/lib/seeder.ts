/**
 * Datos de ejemplo para desarrollo/demo.
 * Solo se ejecuta si la tabla productos está vacía.
 */
import type { SqliteDataStore } from '../store/SqliteDataStore'
import type { Producto } from '@kioscapp/shared'

const LOCAL_ID = import.meta.env.VITE_LOCAL_ID ?? 'local-demo'

function producto(
  id: string,
  barcode: string | null,
  descripcion: string,
  categoria: Producto['categoria'],
  precio_centavos: number,
  fraccionable = false,
): Producto {
  const ts = new Date().toISOString()
  return {
    id,
    codigo_barras: barcode,
    descripcion,
    categoria,
    precio_centavos,
    fraccionable,
    unidad_medida: fraccionable ? 'kg' : 'unidad',
    activo: true,
    created_at: ts,
    updated_at: ts,
    local_id: LOCAL_ID,
    sync_status: 'pending',
    deleted_at: null,
  }
}

export const PRODUCTOS_DEMO: Producto[] = [
  producto('p01', '7790895000083', 'Coca Cola 500ml', 'bebidas', 120000),
  producto('p02', '7790895000090', 'Coca Cola 1.5L', 'bebidas', 195000),
  producto('p03', '7790895050032', 'Sprite 500ml', 'bebidas', 110000),
  producto('p04', '7790040058062', 'Agua Villavicencio 500ml', 'bebidas', 80000),
  producto('p05', '7790040058079', 'Agua Villavicencio 1.5L', 'bebidas', 130000),
  producto('p06', '7770003000026', 'Gatorade Naranja 500ml', 'bebidas', 140000),
  producto('p07', '7791813000135', 'Marlboro Rojo x20', 'cigarrillos', 180000),
  producto('p08', '7791813000142', 'Marlboro Gold x20', 'cigarrillos', 190000),
  producto('p09', '7791813000159', 'Lucky Strike x20', 'cigarrillos', 170000),
  producto('p10', '7622210004512', 'Oreo 117g', 'golosinas', 65000),
  producto('p11', '7622210002342', 'Milka Relleno 155g', 'golosinas', 75000),
  producto('p12', '7790040012009', 'Bon o Bon x16', 'golosinas', 55000),
  producto('p13', null, 'Alfajor Milka', 'golosinas', 35000),
  producto('p14', null, 'Alfajor Havanna Blanco', 'golosinas', 45000),
  producto('p15', null, 'Chupetín', 'golosinas', 5000),
  producto('p16', null, 'Caramelos sueltos (kg)', 'golosinas', 120000, true),
  producto('p17', null, 'Recarga SUBE $100', 'recarga_sube', 10000),
  producto('p18', null, 'Recarga SUBE $200', 'recarga_sube', 20000),
  producto('p19', null, 'Recarga Claro $100', 'recarga_celular', 10000),
  producto('p20', null, 'Recarga Personal $200', 'recarga_celular', 20000),
  producto('p21', '7790895040033', 'Lay\'s Clasicas 45g', 'kiosco', 35000),
  producto('p22', '7790895040040', 'Lay\'s Limon 45g', 'kiosco', 35000),
  producto('p23', '7790040071009', 'Pringles Original 124g', 'kiosco', 75000),
  producto('p24', null, 'Chicle Beldent', 'kiosco', 8000),
  producto('p25', null, 'Mentos Menta', 'kiosco', 12000),
]

export async function seedIfEmpty(store: SqliteDataStore): Promise<void> {
  const productos = await store.getProductos()
  if (productos.length > 0) return

  for (const p of PRODUCTOS_DEMO) {
    await store.upsertProducto(p)
    // Stock inicial de 20 unidades para cada producto
    const ts = new Date().toISOString()
    await (store as any).db.execute(
      `INSERT OR IGNORE INTO stock
         (id, producto_id, cantidad, alerta_minimo, created_at, updated_at,
          local_id, sync_status, deleted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',NULL)`,
      [
        crypto.randomUUID(), p.id, 20, 5, ts, ts, LOCAL_ID,
      ],
    )
  }
}
