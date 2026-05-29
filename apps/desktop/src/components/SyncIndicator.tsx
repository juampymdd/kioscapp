import { useEffect, useState } from 'react'
import { Cloud, CloudOff, RefreshCw, CloudCheck, AlertCircle } from 'lucide-react'
import { syncService, type SyncState } from '../services/syncService'

export default function SyncIndicator() {
  const [state, setState] = useState<SyncState>(syncService.getState())

  useEffect(() => syncService.subscribe(setState), [])

  if (state.status === 'disabled') return null

  const label = {
    idle:    'Sin sincronizar',
    syncing: 'Sincronizando…',
    ok:      state.lastSync
               ? `Sincronizado ${formatRelative(state.lastSync)}`
               : 'Sincronizado',
    error:   'Error de sync',
    offline: 'Sin conexión',
  }[state.status]

  return (
    <div
      className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg select-none"
      title={state.lastError ?? label}
    >
      <StatusIcon status={state.status} />
      <span className={colorClass(state.status)}>{label}</span>
      {state.pendingCount > 0 && (
        <span className="bg-amber-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
          {state.pendingCount}
        </span>
      )}
      {state.status === 'error' && (
        <button
          onClick={() => syncService.sync()}
          className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Reintentar"
        >
          <RefreshCw size={12} />
        </button>
      )}
    </div>
  )
}

function StatusIcon({ status }: { status: SyncState['status'] }) {
  const cls = `shrink-0 ${colorClass(status)}`
  if (status === 'syncing')  return <RefreshCw size={13} className={`${cls} animate-spin`} />
  if (status === 'offline')  return <CloudOff size={13} className={cls} />
  if (status === 'error')    return <AlertCircle size={13} className={cls} />
  if (status === 'ok')       return <CloudCheck size={13} className={cls} />
  return <Cloud size={13} className={cls} />
}

function colorClass(status: SyncState['status']): string {
  if (status === 'ok')      return 'text-emerald-400'
  if (status === 'syncing') return 'text-blue-400'
  if (status === 'offline') return 'text-slate-500'
  if (status === 'error')   return 'text-red-400'
  return 'text-slate-500'
}

function formatRelative(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60)   return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}
