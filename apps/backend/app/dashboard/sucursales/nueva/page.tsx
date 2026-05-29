'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NuevaSucursalPage() {
  const router = useRouter()
  const [nombre,    setNombre]    = useState('')
  const [direccion, setDireccion] = useState('')
  const [ciudad,    setCiudad]    = useState('')
  const [provincia, setProvincia] = useState('')
  const [error,     setError]     = useState<string | null>(null)
  const [loading,   setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/sucursales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, direccion: direccion || undefined, ciudad: ciudad || undefined, provincia: provincia || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al crear'); return }
      router.push(`/dashboard/sucursales/${data.id}`)
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8 text-sm">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-300 transition-colors">Dashboard</Link>
        <span className="text-slate-700">/</span>
        <span className="text-slate-300">Nueva sucursal</span>
      </div>

      <h1 className="text-2xl font-bold text-white mb-8">Nueva sucursal</h1>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Nombre <span className="text-red-400">*</span></label>
          <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required autoFocus
            placeholder="Kiosco Centro"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white
                       placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Dirección</label>
          <input type="text" value={direccion} onChange={e => setDireccion(e.target.value)}
            placeholder="Av. Corrientes 1234"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white
                       placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Ciudad</label>
            <input type="text" value={ciudad} onChange={e => setCiudad(e.target.value)} placeholder="Buenos Aires"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white
                         placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Provincia</label>
            <input type="text" value={provincia} onChange={e => setProvincia(e.target.value)} placeholder="CABA"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white
                         placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl transition-colors">
            {loading ? 'Creando…' : 'Crear sucursal'}
          </button>
          <Link href="/dashboard" className="border border-slate-700 hover:border-slate-500 text-slate-300 px-6 py-2.5 rounded-xl transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
