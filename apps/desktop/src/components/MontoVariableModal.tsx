import { useState } from 'react'
import { X } from 'lucide-react'
import type { Producto } from '@kioscapp/shared'
import MoneyInput from './MoneyInput'

interface Props {
  producto: Producto
  onConfirm: (centavos: number) => void
  onClose: () => void
}

/** Pide el monto al vender un producto de precio variable (recargas, SUBE, etc.). */
export default function MontoVariableModal({ producto, onConfirm, onClose }: Props) {
  const [monto, setMonto] = useState(producto.precio_centavos || 0)

  function confirmar() {
    if (monto > 0) onConfirm(monto)
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onKeyDown={e => { if (e.key === 'Enter') confirmar() }}
    >
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-sm p-6">
        <div className="flex justify-between items-start mb-5">
          <div className="min-w-0">
            <h2 className="text-white font-bold text-lg leading-tight truncate">{producto.descripcion}</h2>
            <p className="text-slate-400 text-sm mt-0.5">¿Cuánto vendés?</p>
          </div>
          <button onClick={onClose} aria-label="Cancelar" className="text-slate-400 hover:text-white cursor-pointer shrink-0">
            <X size={20} />
          </button>
        </div>

        <label className="text-slate-400 text-xs block mb-1.5">Monto</label>
        <MoneyInput
          centavos={monto}
          onChange={setMonto}
          autoFocus
          className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3
                     text-white text-2xl text-right font-mono
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            onClick={onClose}
            className="py-3 rounded-xl border border-slate-600 text-slate-300
                       hover:bg-slate-800 font-medium cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={monto <= 0}
            className="py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40
                       text-white font-bold cursor-pointer transition-colors
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  )
}
