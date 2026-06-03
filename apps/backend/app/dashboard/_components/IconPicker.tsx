'use client'
import { useMemo, useState } from 'react'
import { icons, Package, type LucideProps } from 'lucide-react'
import type { ComponentType } from 'react'
import { buscarIconos } from '@kioscapp/shared'

/** Selector de íconos para rubros de tienda. Búsqueda en español. */
export default function IconPicker({ value, onChange }: { value: string; onChange: (n: string) => void }) {
  const [q, setQ] = useState('')
  const resultados = useMemo(() => buscarIconos(q), [q])

  return (
    <div className="space-y-2">
      <input
        value={q} onChange={e => setQ(e.target.value)}
        placeholder="Buscar… (ej: café, cigarrillo, helado, limpieza)"
        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-50 text-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="grid grid-cols-10 gap-1 max-h-52 overflow-y-auto p-1 bg-slate-950/40 rounded-lg">
        {resultados.map(i => {
          const Cmp = (icons as Record<string, ComponentType<LucideProps>>)[i.name] ?? Package
          const sel = i.name === value
          return (
            <button key={i.name} type="button" title={i.q.split(' ')[0]} onClick={() => onChange(i.name)}
              className={`grid place-items-center h-9 rounded-md cursor-pointer transition-colors
                ${sel ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
              <Cmp size={18} />
            </button>
          )
        })}
        {resultados.length === 0 && <p className="col-span-10 text-slate-500 text-xs text-center py-4">Sin resultados</p>}
      </div>
    </div>
  )
}
