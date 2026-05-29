'use client'
import { useEffect, useRef, useState } from 'react'
import { X, RefreshCw, Download } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { getDataStore } from '../store/dataStore'
import { SqliteDataStore } from '../store/SqliteDataStore'
import { syncService } from '../services/syncService'

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? ''

interface Props {
  onClose: () => void
}

type PullState = 'idle' | 'pulling' | 'done' | 'error'

export default function ConfigScreen({ onClose }: Props) {
  const [localId,        setLocalId]        = useState('')
  const [syncSecret,     setSyncSecret]     = useState('')
  const [nombreComercio, setNombreComercio] = useState('')
  const [impresoras,     setImpresoras]     = useState<string[]>([])
  const [impresora,      setImpresora]      = useState('')
  const [cargandoPrint,  setCargandoPrint]  = useState(false)
  const [guardando,      setGuardando]      = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [saved,          setSaved]          = useState(false)
  const [pullState,      setPullState]      = useState<PullState>('idle')
  const [pullMsg,        setPullMsg]        = useState('')
  const credsDirty = useRef(false)
  const localIdRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => localIdRef.current?.focus(), 150)
    cargarConfig()
    cargarImpresoras()
    return () => clearTimeout(t)
  }, [])

  async function cargarConfig() {
    const store = getDataStore()
    setLocalId((await store.getConfig('local_id')) ?? '')
    setSyncSecret((await store.getConfig('sync_secret')) ?? '')
    setNombreComercio((await store.getConfig('nombre_comercio')) ?? '')
    setImpresora((await store.getConfig('impresora')) ?? '')
  }

  async function cargarImpresoras() {
    setCargandoPrint(true)
    try {
      const list = await invoke<string[]>('listar_impresoras')
      setImpresoras(list)
    } catch { /* no Tauri or no printers */ } finally { setCargandoPrint(false) }
  }

  async function guardar() {
    if (!localId.trim() || !syncSecret.trim()) return
    setGuardando(true); setError(null); setSaved(false)

    try {
      const store = getDataStore()
      const credencialesCambiaron = credsDirty.current

      await store.setConfig('local_id',        localId.trim())
      await store.setConfig('backend_url',     BACKEND_URL)
      await store.setConfig('sync_secret',     syncSecret.trim())
      if (nombreComercio.trim()) await store.setConfig('nombre_comercio', nombreComercio.trim())
      if (impresora)             await store.setConfig('impresora',        impresora)

      await syncService.restart()
      setSaved(true)

      if (credencialesCambiaron) {
        setPullState('pulling')
        setPullMsg('Descargando ventas existentes…')
        try {
          const result = await syncService.pullVentas(store as SqliteDataStore)
          setPullState('done')
          setPullMsg(`Se importaron ${result.ventas} ventas (${result.items} ítems)`)
        } catch (e) {
          setPullState('error')
          const msg = e instanceof Error ? e.message : String(e)
          setPullMsg(
            msg === 'Failed to fetch' || msg.includes('fetch')
              ? 'No se pudo conectar con el servidor. Las credenciales se guardaron correctamente — las ventas se importarán cuando haya conexión.'
              : msg,
          )
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setGuardando(false)
    }
  }

  const inputClass = `w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
    text-white text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-600`

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 p-8 overflow-y-auto max-h-[90vh]">

        <div className="flex justify-between items-center mb-7">
          <h2 className="text-white text-xl font-bold">Configuración</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-slate-400 text-xs block mb-1.5">ID del local <span className="text-red-400">*</span></label>
            <input ref={localIdRef} type="text" value={localId} onChange={e => { setLocalId(e.target.value); credsDirty.current = true }}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className={inputClass} />
          </div>

          <div>
            <label className="text-slate-400 text-xs block mb-1.5">Clave de sincronización <span className="text-red-400">*</span></label>
            <input type="password" value={syncSecret} autoComplete="off" onChange={e => { setSyncSecret(e.target.value); credsDirty.current = true }}
              placeholder="••••••••••••••••"
              className={inputClass} />
          </div>

          <div>
            <label className="text-slate-400 text-xs block mb-1.5">Nombre del comercio</label>
            <input type="text" value={nombreComercio} onChange={e => setNombreComercio(e.target.value)}
              placeholder="Kiosco El Trébol"
              className={inputClass.replace('font-mono', '')} />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-slate-400 text-xs">Impresora de tickets</label>
              <button onClick={cargarImpresoras} disabled={cargandoPrint}
                className="text-slate-500 hover:text-slate-300 transition-colors" title="Recargar">
                <RefreshCw size={13} className={cargandoPrint ? 'animate-spin' : ''} />
              </button>
            </div>
            {impresoras.length > 0 ? (
              <select value={impresora} onChange={e => setImpresora(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Sin impresora</option>
                {impresoras.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            ) : (
              <p className="text-slate-600 text-xs py-2">
                {cargandoPrint ? 'Buscando…' : 'No se encontraron impresoras.'}
              </p>
            )}
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-950/30 border border-red-900 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {pullState !== 'idle' && (
            <div className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2 border
              ${pullState === 'pulling' ? 'bg-blue-950/30 border-blue-800 text-blue-300' :
                pullState === 'done'    ? 'bg-emerald-950/30 border-emerald-800 text-emerald-300' :
                                          'bg-amber-950/30 border-amber-800 text-amber-300'}`}>
              {pullState === 'pulling'
                ? <RefreshCw size={14} className="animate-spin mt-0.5 shrink-0" />
                : <Download size={14} className="mt-0.5 shrink-0" />}
              {pullMsg}
            </div>
          )}

          {saved && pullState === 'idle' && (
            <p className="text-emerald-400 text-sm">Configuración guardada</p>
          )}

          <button onClick={guardar} disabled={guardando || !localId.trim() || !syncSecret.trim()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40
                       text-white font-semibold rounded-xl cursor-pointer transition-colors">
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
