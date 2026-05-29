import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { useCartStore } from '../store/cartStore'
import { useCajaStore } from '../store/cajaStore'
import SearchInput from '../components/SearchInput'
import ProductGrid from '../components/ProductGrid'
import Cart from '../components/Cart'
import PaymentModal from '../components/PaymentModal'
import { formatCentavos } from '../lib/money'
import { syncService } from '../services/syncService'

export default function POSScreen() {
  const { cajaActiva } = useCajaStore()
  const { items, total, clear } = useCartStore()
  const [filtro, setFiltro] = useState('')
  const [showPayment, setShowPayment] = useState(false)
  const [lastSale, setLastSale] = useState<string | null>(null)

  function handleSuccess() {
    setShowPayment(false)
    setLastSale(new Date().toLocaleTimeString('es-AR'))
    syncService.sync()
  }

  return (
    <div className="flex flex-col h-full bg-slate-950">

      {/* ── Info bar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-900
                      border-b border-slate-800 shrink-0 text-xs">
        <span className="text-slate-500">
          Caja: <span className="text-slate-300">{cajaActiva?.id.slice(0, 8)}</span>
        </span>
        {lastSale && (
          <span className="text-emerald-400 flex items-center gap-1">
            <CheckCircle size={12} /> Venta registrada {lastSale}
          </span>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Panel izquierdo: búsqueda + grid de productos */}
        <div className="flex flex-col gap-3 p-4 flex-1 min-w-0 border-r border-slate-800">
          <SearchInput onFiltroChange={setFiltro} />
          <ProductGrid filtro={filtro} />
        </div>

        {/* Panel derecho: carrito + botones de pago */}
        <div className="flex flex-col w-80 shrink-0 p-4">
          <h2 className="text-slate-400 text-xs uppercase tracking-widest mb-3 font-medium">
            Carrito — {items.length} ítem{items.length !== 1 ? 's' : ''}
          </h2>

          <div className="flex-1 min-h-0">
            <Cart />
          </div>

          <div className="shrink-0 space-y-2 mt-4">
            {items.length > 0 && (
              <button
                onClick={clear}
                className="w-full py-2 rounded-xl border border-slate-700 text-slate-400
                           hover:bg-slate-800 hover:text-slate-300 text-sm cursor-pointer transition-colors"
              >
                Limpiar carrito
              </button>
            )}

            <button
              onClick={() => setShowPayment(true)}
              disabled={items.length === 0}
              className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500
                         disabled:opacity-30 disabled:cursor-not-allowed
                         text-white font-bold text-lg cursor-pointer transition-colors"
            >
              Cobrar {items.length > 0 ? formatCentavos(total()) : ''}
            </button>
          </div>
        </div>
      </div>

      {showPayment && (
        <PaymentModal
          onClose={() => setShowPayment(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
