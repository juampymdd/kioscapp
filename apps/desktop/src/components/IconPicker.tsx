import { useMemo, useState } from 'react'
import { buscarIconos } from '@kioscapp/shared'
import CategoriaIcon from './CategoriaIcon'

/** Selector de íconos para rubros de kiosco. Búsqueda en español. */
export default function IconPicker({ value, onChange }: { value: string; onChange: (n: string) => void }) {
  const [q, setQ] = useState('')
  const resultados = useMemo(() => buscarIconos(q), [q])

  return (
    <div className="space-y-2">
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Buscar… (ej: café, cigarrillo, helado, limpieza)"
        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto p-1 bg-slate-950/40 rounded-lg">
        {resultados.map(i => {
          const sel = i.name === value
          return (
            <button
              key={i.name} type="button" title={i.q.split(' ')[0]} onClick={() => onChange(i.name)}
              className={`grid place-items-center h-9 rounded-md cursor-pointer transition-colors
                ${sel ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
            >
              <CategoriaIcon name={i.name} size={18} />
            </button>
          )
        })}
        {resultados.length === 0 && (
          <p className="col-span-8 text-slate-500 text-xs text-center py-4">Sin resultados para "{q}"</p>
        )}
      </div>
    </div>
  )
}
