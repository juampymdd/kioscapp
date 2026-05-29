'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Credenciales {
  id:          string
  sync_secret: string
  nombre:      string
}

export default function NuevaSucursalPage() {
  const router = useRouter()
  const [nombre, setNombre]       = useState('')
  const [direccion, setDireccion] = useState('')
  const [ciudad, setCiudad]       = useState('')
  const [provincia, setProvincia] = useState('')
  const [error, setError]         = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)
  const [creada, setCreada]       = useState<Credenciales | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/puntos-venta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, direccion: direccion || undefined, ciudad: ciudad || undefined, provincia: provincia || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al crear'); return }
      setCreada({ id: data.id, sync_secret: data.sync_secret, nombre: data.nombre })
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  if (creada) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Sucursal creada</h1>
        <p className="text-slate-400 mb-8">Guardá estas credenciales. Las vas a necesitar para configurar la app en el kiosco.</p>

        <div className="bg-amber-950/40 border border-amber-700 rounded-2xl p-6 mb-8 max-w-xl">
          <p className="text-amber-400 font-semibold mb-1 text-sm">⚠ El sync secret no se vuelve a mostrar</p>
          <p className="text-amber-300/80 text-sm">Si lo perdés, podés regenerarlo desde la configuración de la sucursal.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl space-y-5">
          <h2 className="font-bold text-white text-lg">{creada.nombre}</h2>

          <div>
            <p className="text-slate-400 text-xs mb-2 font-medium uppercase tracking-wider">Local ID</p>
            <code className="block bg-slate-800 text-blue-300 px-4 py-3 rounded-xl text-sm font-mono break-all">
              {creada.id}
            </code>
          </div>

          <div>
            <p className="text-slate-400 text-xs mb-2 font-medium uppercase tracking-wider">Sync Secret</p>
            <code className="block bg-slate-800 text-emerald-300 px-4 py-3 rounded-xl text-sm font-mono break-all">
              {creada.sync_secret}
            </code>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={() => router.push(`/dashboard/puntos-venta/${creada.id}`)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
          >
            Ver sucursal
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="border border-slate-700 hover:border-slate-500 text-slate-300 px-5 py-2.5 rounded-xl font-medium transition-colors"
          >
            Ir al dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
          Dashboard
        </Link>
        <span className="text-slate-700">/</span>
        <span className="text-slate-300 text-sm">Nueva sucursal</span>
      </div>

      <h1 className="text-2xl font-bold text-white mb-8">Nueva sucursal</h1>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Nombre <span className="text-red-400">*</span></label>
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            required
            autoFocus
            placeholder="Kiosco Centro"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5
                       text-white placeholder-slate-500 focus:outline-none focus:ring-2
                       focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Dirección</label>
          <input
            type="text"
            value={direccion}
            onChange={e => setDireccion(e.target.value)}
            placeholder="Av. Corrientes 1234"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5
                       text-white placeholder-slate-500 focus:outline-none focus:ring-2
                       focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Ciudad</label>
            <input
              type="text"
              value={ciudad}
              onChange={e => setCiudad(e.target.value)}
              placeholder="Buenos Aires"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5
                         text-white placeholder-slate-500 focus:outline-none focus:ring-2
                         focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Provincia</label>
            <input
              type="text"
              value={provincia}
              onChange={e => setProvincia(e.target.value)}
              placeholder="CABA"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5
                         text-white placeholder-slate-500 focus:outline-none focus:ring-2
                         focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white
                       font-bold px-6 py-2.5 rounded-xl transition-colors"
          >
            {loading ? 'Creando…' : 'Crear sucursal'}
          </button>
          <Link
            href="/dashboard"
            className="border border-slate-700 hover:border-slate-500 text-slate-300 px-6 py-2.5 rounded-xl transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
