/**
 * Motor de sincronización — Fase 3.
 *
 * Estrategia:
 *  1. pushPendientes: envía al central todo lo que tiene sync_status='pending'
 *  2. pullCatalogo: descarga productos/stock actualizados desde el central
 *  3. Reintentos con backoff exponencial (máx 5 intentos)
 *  4. No bloquea la UI: corre en background
 */
import { getDataStore } from '../store/dataStore'
import type { SqliteDataStore } from '../store/SqliteDataStore'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? ''
const LOCAL_ID    = import.meta.env.VITE_LOCAL_ID ?? 'local-demo'
const MAX_RETRIES = 5

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let attempt = 0
  while (attempt < MAX_RETRIES) {
    try {
      const res = await fetch(url, init)
      if (res.ok) return res
      throw new Error(`HTTP ${res.status}`)
    } catch (err) {
      attempt++
      if (attempt >= MAX_RETRIES) throw err
      await sleep(1000 * 2 ** attempt) // backoff: 2s, 4s, 8s, 16s
    }
  }
  throw new Error('Max retries exceeded')
}

/** Empuja registros pendientes al backend central. */
async function pushPendientes(): Promise<void> {
  if (!BACKEND_URL) return
  const store = getDataStore()
  const pendientes = await store.getPendientesSincronizacion()
  if (!pendientes.length) return

  // Cargar los datos completos de cada tabla pendiente
  // Nota: el store expone métodos get por tabla en el SqliteDataStore
  const payload: Record<string, unknown[]> = { local_id: LOCAL_ID }
  const s = store as SqliteDataStore

  for (const { tabla, ids } of pendientes) {
    switch (tabla) {
      case 'ventas':
        payload.ventas = await Promise.all(ids.map(id => (s as any).db.select(
          `SELECT * FROM ventas WHERE id=$1`, [id],
        )))
        break
      case 'venta_items':
        payload.venta_items = []
        for (const id of ids) {
          const rows = await (s as any).db.select(`SELECT * FROM venta_items WHERE id=$1`, [id])
          payload.venta_items = [...(payload.venta_items as unknown[]), ...rows]
        }
        break
      case 'cajas':
        payload.cajas = []
        for (const id of ids) {
          const rows = await (s as any).db.select(`SELECT * FROM cajas WHERE id=$1`, [id])
          payload.cajas = [...(payload.cajas as unknown[]), ...rows]
        }
        break
      case 'movimientos_caja':
        payload.movimientos_caja = []
        for (const id of ids) {
          const rows = await (s as any).db.select(`SELECT * FROM movimientos_caja WHERE id=$1`, [id])
          payload.movimientos_caja = [...(payload.movimientos_caja as unknown[]), ...rows]
        }
        break
    }
  }

  await fetchWithRetry(`${BACKEND_URL}/api/sync/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  // Marcar como sincronizados
  for (const { tabla, ids } of pendientes) {
    await store.marcarSincronizado(tabla, ids)
  }
}

/** Descarga catálogo actualizado del central y lo aplica localmente. */
async function pullCatalogo(since?: string): Promise<void> {
  if (!BACKEND_URL) return
  const url = since
    ? `${BACKEND_URL}/api/catalog?since=${encodeURIComponent(since)}`
    : `${BACKEND_URL}/api/catalog`

  const res = await fetchWithRetry(url, { method: 'GET' })
  const data = await res.json() as {
    productos: unknown[]
    stock: unknown[]
    generado_at: string
  }

  const store = getDataStore() as SqliteDataStore
  for (const p of data.productos) {
    await store.upsertProducto(p as any)
  }
  // Stock se actualiza mediante upsert directo
  for (const s of data.stock) {
    const row = s as any
    await (store as any).db.execute(
      `INSERT INTO stock
         (id, producto_id, cantidad, alerta_minimo, created_at, updated_at,
          local_id, sync_status, deleted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'synced',$8)
       ON CONFLICT(id) DO UPDATE SET
         cantidad=excluded.cantidad,
         alerta_minimo=excluded.alerta_minimo,
         updated_at=excluded.updated_at,
         sync_status='synced'`,
      [
        row.id, row.producto_id, row.cantidad, row.alerta_minimo,
        row.created_at, row.updated_at, row.local_id, row.deleted_at,
      ],
    )
  }

  localStorage.setItem('catalog_last_sync', data.generado_at)
}

/** Corre un ciclo completo de sync. Llama esto desde un setInterval. */
export async function runSync(): Promise<void> {
  try {
    await pushPendientes()
  } catch (e) {
    console.warn('[sync] push falló:', e)
  }

  try {
    const since = localStorage.getItem('catalog_last_sync') ?? undefined
    await pullCatalogo(since)
  } catch (e) {
    console.warn('[sync] pull catálogo falló:', e)
  }
}

/** Inicia el motor de sync en background. Intervalo cada 30 segundos. */
export function startSyncEngine(): () => void {
  runSync() // primer intento inmediato
  const interval = setInterval(runSync, 30_000)
  return () => clearInterval(interval)
}
