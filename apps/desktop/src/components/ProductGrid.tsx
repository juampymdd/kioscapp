import { useEffect, useState } from 'react'
import type { Producto } from '@kioscapp/shared'
import { getDataStore } from '../store/dataStore'
import { useCartStore } from '../store/cartStore'
import { formatCentavos } from '../lib/money'

const CATEGORIA_EMOJI: Record<string, string> = {
  cigarrillos: '🚬',
  bebidas: '🥤',
  golosinas: '🍬',
  kiosco: '🛒',
  recarga_sube: '🚌',
  recarga_celular: '📱',
  varios: '📦',
}

export default function ProductGrid() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [filtro, setFiltro] = useState('')
  const addItem = useCartStore(s => s.addItem)

  useEffect(() => {
    getDataStore().getProductos().then(setProductos)
  }, [])

  const filtrados = filtro
    ? productos.filter(p =>
        p.descripcion.toLowerCase().includes(filtro.toLowerCase()) ||
        p.categoria.includes(filtro.toLowerCase()),
      )
    : productos

  return (
    <div className="flex flex-col gap-3 h-full">
      <input
        type="text"
        value={filtro}
        onChange={e => setFiltro(e.target.value)}
        placeholder="Filtrar productos…"
        className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-2
                   text-white placeholder-slate-500 focus:outline-none focus:ring-2
                   focus:ring-blue-500 text-sm"
      />

      <div className="grid grid-cols-2 gap-2 overflow-y-auto flex-1 pr-1">
        {filtrados.map(p => (
          <button
            key={p.id}
            onClick={() => addItem(p)}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700
                       hover:border-blue-500 rounded-xl p-3 text-left
                       transition-all cursor-pointer group"
          >
            <div className="text-2xl mb-1">
              {CATEGORIA_EMOJI[p.categoria] ?? '📦'}
            </div>
            <div className="text-white text-sm font-medium leading-tight line-clamp-2">
              {p.descripcion}
            </div>
            <div className="text-blue-400 font-bold mt-1">
              {formatCentavos(p.precio_centavos)}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
