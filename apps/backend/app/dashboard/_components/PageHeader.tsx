import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

interface Crumb {
  label: string
  href?: string
}

interface Props {
  Icon: LucideIcon
  title: string
  subtitle?: string
  breadcrumb?: Crumb[]
  /** Acciones alineadas a la derecha (botones, badges) */
  actions?: React.ReactNode
}

/**
 * Encabezado de página del dashboard. Espejo del ScreenHeader del desktop:
 * chip de acento azul + ícono + título con peso. Misma identidad en ambos lados.
 */
export default function PageHeader({ Icon, title, subtitle, breadcrumb, actions }: Props) {
  return (
    <div className="mb-8">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="flex items-center gap-2 mb-4 text-sm" aria-label="Migas de pan">
          {breadcrumb.map((c, i) => (
            <span key={`${c.label}-${i}`} className="flex items-center gap-2">
              {i > 0 && <span className="text-slate-700">/</span>}
              {c.href
                ? <Link href={c.href} className="text-slate-400 hover:text-white transition-colors">{c.label}</Link>
                : <span className="text-slate-300">{c.label}</span>}
            </span>
          ))}
        </nav>
      )}

      <div className="flex items-center gap-3">
        <div className="w-11 h-11 grid place-items-center rounded-xl bg-blue-600/15 text-blue-400 shrink-0">
          <Icon size={22} />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white leading-tight truncate tracking-tight">{title}</h1>
          {subtitle && <p className="text-slate-400 text-sm mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="ml-auto flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  )
}
