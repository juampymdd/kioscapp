'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()
  const [nombre, setNombre]     = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al registrar'); return }
      router.push('/dashboard')
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-center text-blue-400 font-bold text-2xl mb-8">
          KioscApp
        </Link>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <h1 className="text-xl font-bold text-white mb-6">Crear cuenta</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Nombre completo</label>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                required
                autoFocus
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5
                           text-white placeholder-slate-500 focus:outline-none focus:ring-2
                           focus:ring-blue-500 focus:border-transparent"
                placeholder="Juan García"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5
                           text-white placeholder-slate-500 focus:outline-none focus:ring-2
                           focus:ring-blue-500 focus:border-transparent"
                placeholder="hola@kiosco.com"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5
                           text-white placeholder-slate-500 focus:outline-none focus:ring-2
                           focus:ring-blue-500 focus:border-transparent"
                placeholder="Mínimo 8 caracteres"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50
                         text-white font-bold py-2.5 rounded-xl transition-colors"
            >
              {loading ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          ¿Ya tenés cuenta?{' '}
          <Link href="/auth/login" className="text-blue-400 hover:text-blue-300">
            Ingresar
          </Link>
        </p>
      </div>
    </div>
  )
}
