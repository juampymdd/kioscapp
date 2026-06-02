import { ShoppingCart, X, Percent, Tag } from 'lucide-react'
import { useState } from 'react'
import { useCartStore, type CartItem } from '../store/cartStore'
import { formatCentavos } from '../lib/money'

function CartRow({ item }: { item: CartItem }) {
  const { updateCantidad, removeItem, setDescuentoManualItem } = useCartStore()
  const [editando, setEditando] = useState(false)
  const [modo, setModo] = useState<'monto' | 'porcentaje'>('porcentaje')
  const [valor, setValor] = useState('')

  const esPromo = item.descuento_origen === 'promo'

  function aplicar() {
    const n = Number(valor)
    if (!Number.isFinite(n) || n <= 0) { setDescuentoManualItem(item.producto.id, null, null); setEditando(false); return }
    const centavos = modo === 'porcentaje'
      ? Math.floor((item.subtotal_centavos * n) / 100)
      : Math.round(n * 100)
    const detalle = modo === 'porcentaje' ? `${n}%` : null
    setDescuentoManualItem(item.producto.id, centavos, detalle)
    setEditando(false); setValor('')
  }

  return (
    <div className="flex flex-col gap-1.5 py-3 border-b border-slate-700/50">
      {/* Línea 1: nombre + descuento + quitar */}
      <div className="flex items-start gap-2">
        <p className="flex-1 min-w-0 text-white text-sm font-medium leading-snug line-clamp-2">
          {item.producto.descripcion}
        </p>
        {!esPromo && (
          <button
            onClick={() => setEditando(e => !e)}
            aria-label={`Descuento manual para ${item.producto.descripcion}`}
            title="Descuento manual"
            className="w-7 h-7 -mt-0.5 grid place-items-center rounded-lg text-slate-400 shrink-0
                       hover:text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <Percent size={14} />
          </button>
        )}
        <button
          onClick={() => removeItem(item.producto.id)}
          aria-label={`Quitar ${item.producto.descripcion} del carrito`}
          className="w-7 h-7 -mt-0.5 grid place-items-center rounded-lg text-slate-400 shrink-0
                     hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          <X size={15} />
        </button>
      </div>

      {/* Línea 2: precio unit · stepper · subtotal */}
      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-xs tabular-nums">
          {formatCentavos(item.producto.precio_centavos)} c/u
        </span>

        <div className="flex items-center gap-1 ml-auto shrink-0">
          <button
            onClick={() => updateCantidad(item.producto.id, item.cantidad - (item.producto.fraccionable ? 0.1 : 1))}
            aria-label={`Quitar uno de ${item.producto.descripcion}`}
            className="w-9 h-9 rounded-lg bg-slate-700 hover:bg-slate-600 text-white
                       text-lg font-bold cursor-pointer transition-colors
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            −
          </button>
          <span className="w-9 text-center text-white font-mono text-sm tabular-nums">
            {item.producto.fraccionable ? item.cantidad.toFixed(2) : item.cantidad}
          </span>
          <button
            onClick={() => updateCantidad(item.producto.id, item.cantidad + (item.producto.fraccionable ? 0.1 : 1))}
            aria-label={`Agregar uno de ${item.producto.descripcion}`}
            className="w-9 h-9 rounded-lg bg-slate-700 hover:bg-slate-600 text-white
                       text-lg font-bold cursor-pointer transition-colors
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            +
          </button>
        </div>

        <span className="w-20 text-right text-white font-semibold text-sm tabular-nums shrink-0">
          {formatCentavos(item.subtotal_centavos)}
        </span>
      </div>

      {/* Línea de descuento aplicado, con origen */}
      {item.descuento_centavos > 0 && (
        <div className="flex justify-end items-center gap-1.5 text-amber-400 text-xs tabular-nums">
          {esPromo
            ? <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300"><Tag size={11} /> Promo{item.descuento_detalle ? ` ${item.descuento_detalle}` : ''}</span>
            : <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">Manual{item.descuento_detalle ? ` ${item.descuento_detalle}` : ''}</span>}
          − {formatCentavos(item.descuento_centavos)}
        </div>
      )}

      {/* Editor de descuento manual (oculto si hay promo del catálogo) */}
      {editando && !esPromo && (
        <div className="flex items-center gap-2 mt-1">
          <div className="flex rounded-lg overflow-hidden border border-slate-600">
            <button onClick={() => setModo('porcentaje')}
              className={`px-2 py-1 text-xs ${modo === 'porcentaje' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}>%</button>
            <button onClick={() => setModo('monto')}
              className={`px-2 py-1 text-xs ${modo === 'monto' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}>$</button>
          </div>
          <input
            type="number" value={valor} onChange={e => setValor(e.target.value)} autoFocus
            placeholder={modo === 'porcentaje' ? '10' : '100'}
            className="w-20 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-white text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <button onClick={aplicar}
            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium cursor-pointer">
            Aplicar
          </button>
          {item.descuentoManual_centavos !== null && (
            <button onClick={() => { setDescuentoManualItem(item.producto.id, null); setEditando(false) }}
              className="px-2 py-1 text-xs text-slate-400 hover:text-white cursor-pointer">Quitar</button>
          )}
        </div>
      )}
    </div>
  )
}

export default function Cart() {
  const { items, subtotal, total, descuento_centavos, descuentoItems } = useCartStore()

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <ShoppingCart size={48} className="mb-3 text-slate-600" />
        <p className="text-sm font-medium text-slate-300">Carrito vacío</p>
        <p className="text-xs mt-1">Escaneá o seleccioná un producto</p>
      </div>
    )
  }

  const descItems = descuentoItems()

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

        {descItems > 0 && (
          <div className="flex justify-between text-amber-400 text-sm">
            <span>Descuento ítems</span>
            <span>− {formatCentavos(descItems)}</span>
          </div>
        )}

        {descuento_centavos > 0 && (
          <div className="flex justify-between text-amber-400 text-sm">
            <span>Descuento venta</span>
            <span>− {formatCentavos(descuento_centavos)}</span>
          </div>
        )}

        <div className="flex justify-between items-baseline text-white pt-1">
          <span className="text-base font-semibold">Total</span>
          <span className="text-blue-400 text-2xl font-bold tabular-nums">{formatCentavos(total())}</span>
        </div>
      </div>
    </div>
  )
}
