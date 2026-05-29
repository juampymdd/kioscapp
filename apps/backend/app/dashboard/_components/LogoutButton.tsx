'use client'

import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/auth/login')
  }

  return (
    <button
      onClick={logout}
      className="text-slate-400 hover:text-white text-sm transition-colors cursor-pointer"
    >
      Salir
    </button>
  )
}
