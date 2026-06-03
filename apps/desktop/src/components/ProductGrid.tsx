import { useEffect, useState } from 'react'
import { LayoutGrid } from 'lucide-react'
import type { CategoriaProducto, Producto, Categoria } from '@kioscapp/shared'
import { getDataStore } from '../store/dataStore'
import { useCartStore } from '../store/cartStore'
import { formatCentavos } from '../lib/money'
import Skeleton from './Skeleton'
import CategoriaIcon from './CategoriaIcon'

interface Props {
  filtro: string
}

export default function ProductGrid({ filtro }: Props) {
  const [productos, setProductos] = useState<Producto[]>([])
  const [cats, setCats]           = useState<Categoria[]>([])
  const [cargando, setCargando]   = useState(true)
  const [categoria, setCategoria] = useState<CategoriaProducto | null>(null)
  const addItem = useCartStore(s => s.addItem)

  useEffect(() => {
    getDataStore().getCategorias().then(setCats)
    getDataStore().getProductos().then(setProductos).finally(() => setCargando(false))
  }, [])

  // Categorías (en orden) que realmente tienen productos
  const conProductos = new Set(productos.map(p => p.categoria))
  const categoriasConProductos = cats.filter(c => conProductos.has(c.id))
  const catById = (id: string) => cats.find(c => c.id === id)

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
          aria-pressed={categoria === null}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                      transition-colors cursor-pointer
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
                      ${categoria === null
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
        >
          <LayoutGrid size={11} />
          Todos
        </button>
        {categoriasConProductos.map(cat => {
          const active = categoria === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => setCategoria(active ? null : cat.id)}
              aria-pressed={active}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                          transition-colors cursor-pointer
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
                          ${active
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                          }`}
            >
              <CategoriaIcon name={cat.icono} size={11} />
              {cat.nombre}
            </button>
          )
        })}
      </div>

      {/* Grid de productos */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2 overflow-y-auto flex-1 pr-1 content-start auto-rows-min">
        {cargando && Array.from({ length: 10 }).map((_, i) => (
          <div key={`sk-${i}`} className="flex flex-col bg-slate-800/60 border border-slate-700 rounded-xl p-3 min-h-[7.5rem]">
            <Skeleton className="w-9 h-9 rounded-lg mb-2 bg-slate-700" />
            <Skeleton className="h-3.5 w-11/12 mb-1.5 bg-slate-700" />
            <Skeleton className="h-3.5 w-2/3 bg-slate-700" />
            <Skeleton className="h-4 w-1/2 mt-auto bg-slate-700" />
          </div>
        ))}
        {!cargando && filtrados.map(p => {
          const icono = catById(p.categoria)?.icono ?? 'Package'
          return (
            <button
              key={p.id}
              onClick={() => addItem(p)}
              aria-label={`Agregar ${p.descripcion}, ${formatCentavos(p.precio_centavos)}`}
              className="group flex flex-col bg-slate-800 hover:bg-slate-700 border border-slate-700
                         hover:border-blue-500 rounded-xl p-3 text-left min-h-[7.5rem]
                         transition-colors cursor-pointer
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <div className="w-9 h-9 grid place-items-center rounded-lg bg-slate-700/60
                              group-hover:bg-blue-600/20 transition-colors mb-2 shrink-0">
                <CategoriaIcon name={icono} size={18} className="text-slate-300 group-hover:text-blue-300 transition-colors" />
              </div>
              <div className="text-white text-sm font-medium leading-snug line-clamp-2">
                {p.descripcion}
              </div>
              <div className="mt-auto pt-2 border-t border-slate-700/70 group-hover:border-slate-600 transition-colors">
                <span className="text-blue-400 font-bold text-lg tabular-nums tracking-tight">
                  {formatCentavos(p.precio_centavos)}
                </span>
              </div>
            </button>
          )
        })}
        {!cargando && filtrados.length === 0 && (
          <div className="col-span-full flex items-center justify-center py-12 text-slate-400 text-sm">
            {q || categoria ? 'Sin resultados' : 'Sin productos'}
          </div>
        )}
      </div>
    </div>
  )
}
