'use client'

import { useState } from 'react'

export interface DashboardTab {
  id: string
  label: string
  panel: React.ReactNode
}

/**
 * Navegación por pestañas del dashboard. Reemplaza el scroll largo
 * para que no te pierdas: cada vista (Resumen / Análisis / Sucursales)
 * en su propia pestaña. Indicador con borde inferior (no side-stripe).
 */
export default function DashboardTabs({ tabs }: { tabs: DashboardTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id)
  const current = tabs.find(t => t.id === active) ?? tabs[0]

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Vistas del dashboard" className="flex gap-1 border-b border-slate-800">
        {tabs.map(t => {
          const on = active === t.id
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={on}
              onClick={() => setActive(t.id)}
              className={`px-4 py-2.5 text-sm font-medium -mb-px border-b-2 cursor-pointer transition-colors
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-t
                          ${on
                            ? 'border-blue-500 text-white'
                            : 'border-transparent text-slate-400 hover:text-white'}`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      <div role="tabpanel">{current?.panel}</div>
    </div>
  )
}
