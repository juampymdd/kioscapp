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
    this.backendUrl = await store.getConfig('backend_url')
    this.syncSecret = await store.getConfig('sync_secret')
    this.localId = (await store.getConfig('local_id')) ?? 'local-demo'

    if (!this.backendUrl) {
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

      const res = await fetch(`${this.backendUrl}/api/sync/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.syncSecret ? { 'x-sync-secret': this.syncSecret } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)

      for (const { tabla, ids } of pendientes) {
        await store.marcarSincronizado(tabla, ids)
      }

      this.setState({ status: 'ok', pendingCount: 0, lastSync: new Date(), lastError: null })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
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
