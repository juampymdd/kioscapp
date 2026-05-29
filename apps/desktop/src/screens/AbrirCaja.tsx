import { useState } from 'react'
import { Store } from 'lucide-react'
import { useCajaStore } from '../store/cajaStore'
import { getDataStore } from '../store/dataStore'
import MoneyInput from '../components/MoneyInput'

export default function AbrirCaja() {
  const { setCajaActiva } = useCajaStore()
  const [monto, setMonto] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAbrir() {
    setLoading(true)
    setError(null)
    try {
      const store = getDataStore()
      const ts = new Date().toISOString()
      const localId = import.meta.env.VITE_LOCAL_ID ?? 'local-demo'
      const caja = {
        id: crypto.randomUUID(),
        usuario_id: null,
        apertura_at: ts,
        cierre_at: null,
        monto_apertura_centavos: monto,

        monto_cierre_centavos: null,
        estado: 'abierta' as const,
        created_at: ts,
        updated_at: ts,
        local_id: localId,
        deleted_at: null,
      }
      await store.abrirCaja(caja)
      await store.registrarMovimientoCaja({
        id: crypto.randomUUID(),
        caja_id: caja.id,
        tipo: 'apertura',
        monto_centavos: monto,
        descripcion: 'Apertura de caja',
        created_at: ts,
        updated_at: ts,
        local_id: localId,
        deleted_at: null,
      })
      setCajaActiva({ ...caja, sync_status: 'pending' })
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-slate-950">
      <div className="w-full max-w-sm bg-slate-900 rounded-2xl p-8 shadow-2xl border border-slate-700">
        <div className="text-center mb-8">
          <Store size={48} className="mx-auto mb-3 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">KioscApp</h1>
          <p className="text-slate-400 mt-1">Apertura de caja</p>
        </div>

        <label className="block text-slate-300 text-sm font-medium mb-2">
          Monto inicial en caja
        </label>
        <MoneyInput
          centavos={monto}
          onChange={setMonto}
          autoFocus
          className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3
                     text-white text-xl text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {error && (
          <p className="text-red-400 text-sm mt-3">{error}</p>
        )}

        <button
          onClick={handleAbrir}
          disabled={loading}
          className="mt-6 w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50
                     text-white font-semibold py-3 rounded-xl text-lg
                     transition-colors cursor-pointer"
        >
          {loading ? 'Abriendo…' : 'Abrir caja'}
        </button>
      </div>
    </div>
  )
}
