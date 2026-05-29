'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  sucursalId: string
  variant?: 'default' | 'primary'
}

export default function NuevaCajaButton({ sucursalId, variant = 'default' }: Props) {
  const router = useRouter()
  const [open,    setOpen]    = useState(false)
  const [nombre,  setNombre]  = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [creada,  setCreada]  = useState<{ id: string; sync_secret: string; nombre: string } | null>(null)

  async function crear() {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/sucursales/${sucursalId}/puntos-venta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre || 'Caja' }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error'); return }
      setCreada({ id: data.id, sync_secret: data.sync_secret, nombre: data.nombre })
    } catch { setError('Error de conexión') } finally { setLoading(false) }
  }

  function cerrar() {
    setOpen(false); setNombre(''); setCreada(null); setError(null)
    router.refresh()
  }

  const btnClass = variant === 'primary'
    ? 'bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-medium transition-colors'
    : 'border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-sm px-3 py-1.5 rounded-lg transition-colors'

  if (!open) {
    return <button onClick={() => setOpen(true)} className={btnClass}>+ Nueva caja</button>
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
        {creada ? (
          <>
            <h3 className="text-white font-bold text-lg mb-2">Caja creada</h3>
            <div className="bg-amber-950/40 border border-amber-700 rounded-xl p-4 mb-5 text-sm text-amber-300">
              ⚠ Guardá estas credenciales — el secret no se vuelve a mostrar.
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-slate-400 text-xs mb-2 uppercase tracking-wider">Local ID</p>
                <code className="block bg-slate-800 text-blue-300 px-4 py-3 rounded-xl text-sm font-mono break-all">{creada.id}</code>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-2 uppercase tracking-wider">Sync Secret</p>
                <code className="block bg-slate-800 text-emerald-300 px-4 py-3 rounded-xl text-sm font-mono break-all">{creada.sync_secret}</code>
              </div>
            </div>
            <button onClick={cerrar} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl transition-colors">
              Listo
            </button>
          </>
        ) : (
          <>
            <h3 className="text-white font-bold text-lg mb-5">Nueva caja</h3>
            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-1.5">Nombre</label>
              <input
                type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Caja 1" autoFocus
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white
                           placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setOpen(false)} className="flex-1 border border-slate-700 text-slate-300 py-2.5 rounded-xl transition-colors hover:bg-slate-800">
                Cancelar
              </button>
              <button onClick={crear} disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors">
                {loading ? 'Creando…' : 'Crear caja'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
