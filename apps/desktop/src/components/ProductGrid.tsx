import { useEffect, useState } from 'react'
import {
  Cigarette, GlassWater, Candy, ShoppingBag, Bus, Smartphone, Package,
  LayoutGrid, type LucideIcon,
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

const CATEGORIA_LABEL: Record<CategoriaProducto, string> = {
  cigarrillos:     'Cigarrillos',
  bebidas:         'Bebidas',
  golosinas:       'Golosinas',
  kiosco:          'Kiosco',
  recarga_sube:    'SUBE',
  recarga_celular: 'Celular',
  varios:          'Varios',
}

interface Props {
  filtro: string
}

export default function ProductGrid({ filtro }: Props) {
  const [productos, setProductos] = useState<Producto[]>([])
  const [categoria, setCategoria] = useState<CategoriaProducto | null>(null)
  const addItem = useCartStore(s => s.addItem)

  useEffect(() => {
    getDataStore().getProductos().then(setProductos)
  }, [])

  // Categorías que realmente tienen productos
  const categoriasConProductos = Array.from(
    new Set(productos.map(p => p.categoria)),
  ) as CategoriaProducto[]

  const q = filtro.trim().toLowerCase()
  const filtrados = productos.filter(p => {
    if (categoria && p.categoria !== categoria) return false
    if (!q) return true
    return p.descripcion.toLowerCase().includes(q) || (p.codigo_barras ?? '').includes(q)
  })

  return (
    <div className="flex flex-col gap-2 h-full min-h-0">

      {/* Chips de categoría */}
      <div className="flex gap-1.5 flex-wrap shrink-0">
        <button
          onClick={() => setCategoria(null)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                      transition-colors cursor-pointer
                      ${categoria === null
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}
        >
          <LayoutGrid size={11} />
          Todos
        </button>
        {categoriasConProductos.map(cat => {
          const Icon = CATEGORIA_ICONS[cat]
          const active = categoria === cat
          return (
            <button
              key={cat}
              onClick={() => setCategoria(active ? null : cat)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                          transition-colors cursor-pointer
                          ${active
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                          }`}
            >
              <Icon size={11} />
              {CATEGORIA_LABEL[cat]}
            </button>
          )
        })}
      </div>

      {/* Grid de productos */}
      <div className="grid grid-cols-2 gap-2 overflow-y-auto flex-1 pr-1 content-start auto-rows-min">
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
        {filtrados.length === 0 && (
          <div className="col-span-2 flex items-center justify-center py-12 text-slate-500 text-sm">
            {q || categoria ? 'Sin resultados' : 'Sin productos'}
          </div>
        )}
      </div>
    </div>
  )
}
