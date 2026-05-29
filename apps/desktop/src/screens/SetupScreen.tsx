import { useEffect, useRef, useState } from 'react'
import { Store } from 'lucide-react'
import { getDataStore } from '../store/dataStore'
import { syncService } from '../services/syncService'

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? ''

interface Props {
  onComplete: () => void
}

export default function SetupScreen({ onComplete }: Props) {
  const [localId,    setLocalId]    = useState<string>('')
  const [syncSecret, setSyncSecret] = useState('')
  const [guardando,  setGuardando]  = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const localIdRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => localIdRef.current?.focus(), 150)
    return () => clearTimeout(t)
  }, [])

  async function guardar() {
    if (!localId.trim() || !syncSecret.trim()) return
    setGuardando(true)
    setError(null)
    try {
      const store = getDataStore()
      await store.setConfig('local_id',    localId.trim())
      await store.setConfig('backend_url', BACKEND_URL)
      await store.setConfig('sync_secret', syncSecret.trim())
      await syncService.restart()
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-slate-950">
      <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 p-8">

        <div className="flex flex-col items-center mb-8">
          <Store size={48} className="text-blue-400 mb-3" />
          <h1 className="text-white text-2xl font-bold">Configuración inicial</h1>
          <p className="text-slate-400 text-sm mt-1 text-center">
            Ingresá los datos que te proporcionó el administrador
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-slate-400 text-xs block mb-1.5">
              ID del local <span className="text-red-400">*</span>
            </label>
            <input
              ref={localIdRef}
              type="text"
              value={localId}
              onChange={e => setLocalId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
                         text-white text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500
                         placeholder-slate-600"
            />
          </div>

          <div>
            <label className="text-slate-400 text-xs block mb-1.5">
              Clave de sincronización <span className="text-red-400">*</span>
            </label>
            <input
              type="password"
              value={syncSecret}
              onChange={e => setSyncSecret(e.target.value)}
              placeholder="••••••••••••••••"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
                         text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500
                         placeholder-slate-600"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-950/30 border border-red-900 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            onClick={guardar}
            disabled={guardando || !localId.trim() || !syncSecret.trim()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40
                       text-white font-semibold rounded-xl cursor-pointer transition-colors"
          >
            {guardando ? 'Guardando…' : 'Comenzar'}
          </button>
        </div>
      </div>
    </div>
  )
}
