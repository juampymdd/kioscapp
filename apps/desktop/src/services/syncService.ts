import { getDataStore } from '../store/dataStore'
import { SqliteDataStore } from '../store/SqliteDataStore'

const SYNC_INTERVAL_MS = 30_000

export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error' | 'offline' | 'disabled'

type Listener = (state: SyncState) => void

export interface SyncState {
  status: SyncStatus
  pendingCount: number
  lastSync: Date | null
  lastError: string | null
}

class SyncService {
  private state: SyncState = {
    status: 'idle',
    pendingCount: 0,
    lastSync: null,
    lastError: null,
  }
  private listeners = new Set<Listener>()
  private timer: ReturnType<typeof setInterval> | null = null
  private running = false

  // Config leída de la DB al iniciar
  private backendUrl: string | null = null
  private syncSecret: string | null = null
  private localId: string = 'local-demo'

  async start() {
    const store = getDataStore()
    const envUrl = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, '') ?? ''
    if (envUrl) {
      await store.setConfig('backend_url', envUrl)
      this.backendUrl = envUrl
    } else {
      this.backendUrl = await store.getConfig('backend_url')
    }
    this.syncSecret = await store.getConfig('sync_secret')
    this.localId = (await store.getConfig('local_id')) ?? 'local-demo'

    console.log('[sync] start — backendUrl:', this.backendUrl, '| localId:', this.localId, '| secret set:', !!this.syncSecret)

    if (!this.backendUrl) {
      console.log('[sync] disabled — no backend_url')
      this.setState({ status: 'disabled' })
      return
    }

    window.addEventListener('online',  () => this.sync())
    window.addEventListener('offline', () => this.setState({ status: 'offline' }))

    this.sync()
    this.timer = setInterval(() => this.sync(), SYNC_INTERVAL_MS)
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
  }

  /** Llamar después de guardar config para recargar y arrancar. */
  async restart() {
    this.stop()
    this.setState({ status: 'idle', lastError: null })
    await this.start()
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    fn(this.state)
    return () => this.listeners.delete(fn)
  }

  async sync(): Promise<void> {
    if (this.running || !this.backendUrl) return
    if (!navigator.onLine) {
      this.setState({ status: 'offline' })
      return
    }

    this.running = true
    this.setState({ status: 'syncing' })

    try {
      const store = getDataStore() as SqliteDataStore
      const pendientes = await store.getPendientesSincronizacion()
      const totalPending = pendientes.reduce((s, t) => s + t.ids.length, 0)
      console.log('[sync] pendientes:', pendientes.map(p => `${p.tabla}(${p.ids.length})`).join(', ') || 'ninguno')

      if (totalPending === 0) {
        this.setState({ status: 'ok', pendingCount: 0, lastSync: new Date(), lastError: null })
        this.running = false
        return
      }

      const payload: Record<string, unknown> = { local_id: this.localId }
      for (const { tabla, ids } of pendientes) {
        const rows = await fetchRows(store, tabla, ids)
        if (rows.length) payload[tabla] = rows
      }

      console.log('[sync] POST', `${this.backendUrl}/api/sync/ingest`, '— tablas:', Object.keys(payload).filter(k => k !== 'local_id'))

      const res = await fetch(`${this.backendUrl}/api/sync/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.syncSecret ? { 'x-sync-secret': this.syncSecret } : {}),
        },
        body: JSON.stringify(payload),
      })

      const responseText = await res.text()
      console.log('[sync] response:', res.status, responseText)

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${responseText}`)

      for (const { tabla, ids } of pendientes) {
        await store.marcarSincronizado(tabla, ids)
      }

      this.setState({ status: 'ok', pendingCount: 0, lastSync: new Date(), lastError: null })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[sync] error:', msg)
      const pending = await this.countPending()
      this.setState({ status: 'error', lastError: msg, pendingCount: pending })
    } finally {
      this.running = false
    }
  }

  private async countPending(): Promise<number> {
    try {
      const store = getDataStore() as SqliteDataStore
      const pendientes = await store.getPendientesSincronizacion()
      return pendientes.reduce((s, t) => s + t.ids.length, 0)
    } catch {
      return this.state.pendingCount
    }
  }

  private setState(patch: Partial<SyncState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach(fn => fn(this.state))
  }

  getState(): SyncState { return this.state }

  async pullVentas(store: SqliteDataStore): Promise<{ ventas: number; items: number }> {
    if (!this.backendUrl || !this.syncSecret || this.localId === 'local-demo') {
      throw new Error('Configuración incompleta')
    }

    const res = await fetch(`${this.backendUrl}/api/puntos-venta/${this.localId}/ventas`, {
      headers: { 'x-sync-secret': this.syncSecret },
    })

    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`Error del servidor: ${res.status} ${txt}`)
    }

    const data: {
      ventas: Array<{
        id: string; created_at: string; local_id: string; caja_id: string
        total_centavos: number; descuento_centavos: number; medio_pago: string
        monto_recibido_centavos: number; vuelto_centavos: number
        anulada: boolean; venta_anulacion_id: string | null
      }>
      venta_items: Array<{
        id: string; created_at: string; local_id: string; venta_id: string
        producto_id: string; descripcion: string; precio_unit_centavos: number
        cantidad: number; subtotal_centavos: number
      }>
    } = await res.json()

    for (const v of data.ventas) {
      await store.db.execute(
        `INSERT OR IGNORE INTO ventas
           (id, created_at, local_id, sync_status, caja_id, total_centavos,
            descuento_centavos, medio_pago, monto_recibido_centavos,
            vuelto_centavos, anulada, venta_anulacion_id)
         VALUES ($1,$2,$3,'synced',$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          v.id, v.created_at, v.local_id, v.caja_id,
          v.total_centavos, v.descuento_centavos, v.medio_pago,
          v.monto_recibido_centavos, v.vuelto_centavos,
          v.anulada ? 1 : 0, v.venta_anulacion_id ?? null,
        ],
      )
    }

    for (const item of data.venta_items) {
      await store.db.execute(
        `INSERT OR IGNORE INTO venta_items
           (id, created_at, local_id, sync_status, venta_id, producto_id,
            descripcion, precio_unit_centavos, cantidad, subtotal_centavos)
         VALUES ($1,$2,$3,'synced',$4,$5,$6,$7,$8,$9)`,
        [
          item.id, item.created_at, item.local_id, item.venta_id,
          item.producto_id, item.descripcion,
          item.precio_unit_centavos, item.cantidad, item.subtotal_centavos,
        ],
      )
    }

    return { ventas: data.ventas.length, items: data.venta_items.length }
  }
}

async function fetchRows(store: SqliteDataStore, tabla: string, ids: string[]): Promise<unknown[]> {
  if (!ids.length) return []
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(',')
  return store.db.select<Record<string, unknown>[]>(
    `SELECT * FROM ${tabla} WHERE id IN (${placeholders})`,
    ids,
  )
}

export const syncService = new SyncService()
