import { useEffect, useState } from 'react'
import { CheckCircle, ShoppingCart } from 'lucide-react'
import { useCartStore } from '../store/cartStore'
import { useCajaStore } from '../store/cajaStore'
import { getDataStore } from '../store/dataStore'
import SearchInput from '../components/SearchInput'
import ProductGrid from '../components/ProductGrid'
import Cart from '../components/Cart'
import PaymentModal from '../components/PaymentModal'
import ScreenHeader from '../components/ScreenHeader'
import { formatCentavos } from '../lib/money'
import { syncService } from '../services/syncService'

export default function POSScreen() {
  const { cajaActiva } = useCajaStore()
  const { items, total, clear } = useCartStore()
  const [filtro, setFiltro] = useState('')
  const [showPayment, setShowPayment] = useState(false)
  const [lastSale, setLastSale] = useState<string | null>(null)

  // Cargar el catálogo de descuentos para resolver en el carrito (offline-friendly).
  useEffect(() => {
    getDataStore().getDescuentosActivos().then(useCartStore.getState().setCatalogo)
  }, [])

  function handleSuccess() {
    setShowPayment(false)
    setLastSale(new Date().toLocaleTimeString('es-AR'))
    syncService.sync()
  }

  return (
    <div className="flex flex-col h-full bg-slate-950">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <ScreenHeader
        Icon={ShoppingCart}
        title="Ventas POS"
        subtitle={cajaActiva ? `Caja ${cajaActiva.id.slice(0, 8)}` : undefined}
      >
        {lastSale && (
          <span className="flex items-center gap-1.5 text-emerald-300 text-xs font-medium
                           bg-emerald-500/15 px-2.5 py-1 rounded-full">
            <CheckCircle size={13} /> Venta registrada {lastSale}
          </span>
        )}
      </ScreenHeader>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Panel izquierdo: búsqueda + grid de productos */}
        <div className="flex flex-col gap-3 p-4 flex-1 min-w-0 border-r border-slate-800">
          <SearchInput onFiltroChange={setFiltro} />
          <ProductGrid filtro={filtro} />
        </div>

        {/* Panel derecho: carrito + botones de pago */}
        <div className="flex flex-col w-96 shrink-0 p-4 bg-slate-900/40">
          <h2 className="text-slate-300 text-sm mb-3 font-semibold">
            Carrito <span className="text-slate-500 font-normal">· {items.length} ítem{items.length !== 1 ? 's' : ''}</span>
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
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
                         disabled:opacity-50 disabled:cursor-not-allowed
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
