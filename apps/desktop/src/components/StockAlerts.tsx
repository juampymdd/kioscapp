import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import type { Producto, Stock } from '@kioscapp/shared'
import { getDataStore } from '../store/dataStore'

export default function StockAlerts() {
  const [bajoStock, setBajoStock] = useState<Array<{ producto: Producto; stock: Stock }>>([])

  useEffect(() => {
    getDataStore().getProductosBajoStock().then(setBajoStock)
    const interval = setInterval(
      () => getDataStore().getProductosBajoStock().then(setBajoStock),
      60_000,
    )
    return () => clearInterval(interval)
  }, [])

  if (bajoStock.length === 0) return null

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-900/40 border border-amber-700
                    rounded-lg text-amber-300 text-xs cursor-default"
         title={bajoStock.map(b => `${b.producto.descripcion}: ${b.stock.cantidad} u.`).join('\n')}
    >
      <AlertTriangle size={14} />
      <span className="font-medium">
        {bajoStock.length} producto{bajoStock.length !== 1 ? 's' : ''} con stock bajo
      </span>
    </div>
  )
}
