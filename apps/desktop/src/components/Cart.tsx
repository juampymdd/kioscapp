import { ShoppingCart, X } from 'lucide-react'
import { useCartStore, type CartItem } from '../store/cartStore'
import { formatCentavos } from '../lib/money'

function CartRow({ item }: { item: CartItem }) {
  const { updateCantidad, removeItem } = useCartStore()

  return (
    <div className="flex items-center gap-2 py-2 border-b border-slate-700/50 group">
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">
          {item.producto.descripcion}
        </p>
        <p className="text-slate-400 text-xs">
          {formatCentavos(item.producto.precio_centavos)} c/u
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => updateCantidad(item.producto.id, item.cantidad - (item.producto.fraccionable ? 0.1 : 1))}
          className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-white
                     text-sm font-bold cursor-pointer transition-colors"
        >
          −
        </button>
        <span className="w-10 text-center text-white font-mono text-sm">
          {item.producto.fraccionable ? item.cantidad.toFixed(2) : item.cantidad}
        </span>
        <button
          onClick={() => updateCantidad(item.producto.id, item.cantidad + (item.producto.fraccionable ? 0.1 : 1))}
          className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-white
                     text-sm font-bold cursor-pointer transition-colors"
        >
          +
        </button>
      </div>

      <div className="text-right shrink-0 w-20">
        <p className="text-white font-semibold text-sm">
          {formatCentavos(item.subtotal_centavos)}
        </p>
      </div>

      <button
        onClick={() => removeItem(item.producto.id)}
        className="text-slate-600 hover:text-red-400 transition-colors cursor-pointer
                   opacity-0 group-hover:opacity-100 text-lg shrink-0"
        title="Quitar"
      >
        <X size={15} />
      </button>
    </div>
  )
}

export default function Cart() {
  const { items, subtotal, total, descuento_centavos } = useCartStore()

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <ShoppingCart size={48} className="mb-3 text-slate-600" />
        <p className="text-sm">Carrito vacío</p>
        <p className="text-xs mt-1">Escaneá o seleccioná un producto</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {items.map(item => (
          <CartRow key={item.producto.id} item={item} />
        ))}
      </div>

      <div className="border-t border-slate-700 pt-3 space-y-2 shrink-0">
        <div className="flex justify-between text-slate-400 text-sm">
          <span>Subtotal</span>
          <span>{formatCentavos(subtotal())}</span>
        </div>

        {descuento_centavos > 0 && (
          <div className="flex justify-between text-amber-400 text-sm">
            <span>Descuento</span>
            <span>− {formatCentavos(descuento_centavos)}</span>
          </div>
        )}

        <div className="flex justify-between text-white text-xl font-bold">
          <span>TOTAL</span>
          <span className="text-blue-400">{formatCentavos(total())}</span>
        </div>
      </div>
    </div>
  )
}
