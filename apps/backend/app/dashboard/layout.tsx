import { redirect } from 'next/navigation'
import { Download } from 'lucide-react'
import { getSession } from '@/src/lib/session'
import LogoutButton from './_components/LogoutButton'
import Logo from '../_components/Logo'
import DashboardNav from './_components/DashboardNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session.userId) redirect('/auth/login')

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-3.5 flex justify-between items-center gap-6">
        <div className="flex items-center gap-6 min-w-0">
          <Logo href="/dashboard" markSize={26} textClass="text-lg" />
          <DashboardNav />
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <a
            href="/api/download"
            className="flex items-center gap-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-500
                       text-white px-3 py-2 rounded-lg transition-colors"
          >
            <Download size={15} /> Descargar app
          </a>
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
