'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RegenerarSecretButton({ pvId }: { pvId: string }) {
  const router = useRouter()
  const [loading, setLoading]     = useState(false)
  const [nuevoSecret, setNuevo]   = useState<string | null>(null)
  const [confirming, setConfirm]  = useState(false)

  async function regenerar() {
    setLoading(true)
    try {
      const res = await fetch(`/api/puntos-venta/${pvId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerar_secret: true }),
      })
      const data = await res.json()
      if (res.ok) {
        setNuevo(data.sync_secret)
        setConfirm(false)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  if (nuevoSecret) {
    return (
      <div>
        <p className="text-amber-400 text-sm mb-2 font-medium">Nuevo sync secret — guardalo ahora:</p>
        <code className="block bg-slate-800 text-emerald-300 px-4 py-3 rounded-xl text-sm font-mono break-all mb-3">
          {nuevoSecret}
        </code>
        <button onClick={() => setNuevo(null)} className="text-slate-400 hover:text-white text-sm transition-colors">
          Cerrar
        </button>
      </div>
    )
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-3">
        <p className="text-amber-400 text-sm">¿Seguro? El secret anterior dejará de funcionar.</p>
        <button
          onClick={regenerar}
          disabled={loading}
          className="text-sm bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Regenerando…' : 'Sí, regenerar'}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="text-sm border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white px-4 py-2 rounded-lg transition-colors"
    >
      Regenerar secret
    </button>
  )
}
