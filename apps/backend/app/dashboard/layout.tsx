import { redirect } from 'next/navigation'
import { getSession } from '@/src/lib/session'
import LogoutButton from './_components/LogoutButton'
import Logo from '../_components/Logo'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session.userId) redirect('/auth/login')

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-3.5 flex justify-between items-center">
        <Logo href="/dashboard" markSize={26} textClass="text-lg" />
        <div className="flex items-center gap-4">
          <span className="text-slate-400 text-sm">{session.nombre}</span>
          <LogoutButton />
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
