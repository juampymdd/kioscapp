'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  suc: { id: string; nombre: string; direccion: string | null; ciudad: string | null; provincia: string | null }
}

export default function EditarSucursalForm({ suc }: Props) {
  const router = useRouter()
  const [nombre,    setNombre]    = useState(suc.nombre)
  const [direccion, setDireccion] = useState(suc.direccion ?? '')
  const [ciudad,    setCiudad]    = useState(suc.ciudad    ?? '')
  const [provincia, setProvincia] = useState(suc.provincia ?? '')
  const [error,     setError]     = useState<string | null>(null)
  const [success,   setSuccess]   = useState(false)
  const [loading,   setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setSuccess(false); setLoading(true)
    try {
      const res = await fetch(`/api/sucursales/${suc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, direccion: direccion || null, ciudad: ciudad || null, provincia: provincia || null }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al guardar'); return }
      setSuccess(true); router.refresh()
    } catch { setError('Error de conexión') } finally { setLoading(false) }
  }

  const field = (label: string, value: string, onChange: (v: string) => void, placeholder?: string) => (
    <div>
      <label className="block text-sm text-slate-400 mb-1.5">{label}</label>
      <input type="text" value={value} onChange={e => { onChange(e.target.value); setSuccess(false) }} placeholder={placeholder}
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white
                   placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      {field('Nombre', nombre, setNombre)}
      {field('Dirección', direccion, setDireccion)}
      <div className="grid grid-cols-2 gap-4">
        {field('Ciudad', ciudad, setCiudad)}
        {field('Provincia', provincia, setProvincia)}
      </div>
      {error   && <p className="text-red-400 text-sm">{error}</p>}
      {success && <p className="text-emerald-400 text-sm">Guardado correctamente</p>}
      <button type="submit" disabled={loading}
        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-xl transition-colors text-sm">
        {loading ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  )
}
