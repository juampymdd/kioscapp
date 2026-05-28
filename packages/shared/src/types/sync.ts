export type SyncStatus = 'pending' | 'synced'

/** Campos presentes en toda tabla que se sincroniza entre local y central. */
export interface SyncFields {
  /** UUID v4 generado en el cliente. NUNCA autoincrement. */
  id: string
  created_at: string  // ISO8601 UTC
  updated_at: string  // ISO8601 UTC
  /** ID del local que originó el registro. */
  local_id: string
  /** Estado de sincronización hacia el central. */
  sync_status: SyncStatus
  /** Soft-delete: nunca borrar antes de sincronizar. */
  deleted_at: string | null
}
