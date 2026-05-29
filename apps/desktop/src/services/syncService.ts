import { getDataStore } from '../store/dataStore'
import { SqliteDataStore } from '../store/SqliteDataStore'

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, '')
const SYNC_SECRET = import.meta.env.VITE_SYNC_SECRET as string | undefined
const LOCAL_ID    = (import.meta.env.VITE_LOCAL_ID as string | undefined) ?? 'local-demo'
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

  start() {
    if (!BACKEND_URL) {
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

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    fn(this.state)
    return () => this.listeners.delete(fn)
  }

  async sync(): Promise<void> {
    if (this.running || !BACKEND_URL) return
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

      // Recopilar registros completos por tabla
      const payload: Record<string, unknown[]> = { local_id: LOCAL_ID as unknown as unknown[] }

      for (const { tabla, ids } of pendientes) {
        const rows = await fetchPendingRows(store, tabla, ids)
        if (rows.length) payload[tabla] = rows
      }

      const res = await fetch(`${BACKEND_URL}/api/sync/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(SYNC_SECRET ? { 'x-sync-secret': SYNC_SECRET } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const txt = await res.text()
        throw new Error(`HTTP ${res.status}: ${txt}`)
      }

      // Marcar como sincronizados
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

  async refreshPendingCount() {
    const count = await this.countPending()
    this.setState({ pendingCount: count })
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

async function fetchPendingRows(store: SqliteDataStore, tabla: string, ids: string[]): Promise<unknown[]> {
  if (!ids.length) return []
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(',')
  const rows = await store.db.select<Record<string, unknown>[]>(
    `SELECT * FROM ${tabla} WHERE id IN (${placeholders})`,
    ids,
  )
  return rows
}

export const syncService = new SyncService()
