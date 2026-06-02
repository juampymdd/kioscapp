import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  Icon: LucideIcon
  title: string
  subtitle?: string
  /** Acciones / filtros alineados a la derecha */
  children?: ReactNode
}

/**
 * Encabezado de pantalla consistente en toda la app.
 * Identidad: chip de acento azul + título con peso, borde inferior.
 * Plano (sin sombra) por la Regla Plana del DESIGN.md.
 */
export default function ScreenHeader({ Icon, title, subtitle, children }: Props) {
  return (
    <header className="flex items-center gap-3 px-5 py-3 border-b border-slate-800 bg-slate-900/60 shrink-0">
      <div className="w-9 h-9 grid place-items-center rounded-lg bg-blue-600/15 text-blue-400 shrink-0">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <h1 className="text-white text-lg font-bold leading-tight truncate">{title}</h1>
        {subtitle && <p className="text-slate-400 text-xs leading-tight mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="ml-auto flex items-center gap-2 shrink-0">{children}</div>}
    </header>
  )
}
