import { useEffect, useState } from 'react'
import {
  Cigarette, GlassWater, Candy, ShoppingBag, Bus, Smartphone, Package,
  type LucideIcon,
} from 'lucide-react'
import type { CategoriaProducto, Producto } from '@kioscapp/shared'
import { getDataStore } from '../store/dataStore'
import { useCartStore } from '../store/cartStore'
import { formatCentavos } from '../lib/money'

const CATEGORIA_ICONS: Record<CategoriaProducto, LucideIcon> = {
  cigarrillos:     Cigarette,
  bebidas:         GlassWater,
  golosinas:       Candy,
  kiosco:          ShoppingBag,
  recarga_sube:    Bus,
  recarga_celular: Smartphone,
  varios:          Package,
}

interface Props {
  filtro: string
}

export default function ProductGrid({ filtro }: Props) {
  const [productos, setProductos] = useState<Producto[]>([])
  const addItem = useCartStore(s => s.addItem)

  useEffect(() => {
    getDataStore().getProductos().then(setProductos)
  }, [])

  const q = filtro.trim().toLowerCase()
  const filtrados = q
    ? productos.filter(p =>
        p.descripcion.toLowerCase().includes(q) ||
        (p.codigo_barras ?? '').includes(q),
      )
    : productos

  return (
    <div className="grid grid-cols-2 gap-2 overflow-y-auto flex-1 pr-1">
      {filtrados.map(p => {
        const Icon = CATEGORIA_ICONS[p.categoria] ?? Package
        return (
          <button
            key={p.id}
            onClick={() => addItem(p)}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700
                       hover:border-blue-500 rounded-xl p-3 text-left
                       transition-all cursor-pointer"
          >
            <Icon size={22} className="text-slate-400 mb-1" />
            <div className="text-white text-sm font-medium leading-tight line-clamp-2">
              {p.descripcion}
            </div>
            <div className="text-blue-400 font-bold mt-1 text-sm">
              {formatCentavos(p.precio_centavos)}
            </div>
          </button>
        )
      })}
      {filtrados.length === 0 && q && (
        <div className="col-span-2 flex items-center justify-center py-12 text-slate-500 text-sm">
          Sin resultados para "{filtro}"
        </div>
      )}
    </div>
  )
}
