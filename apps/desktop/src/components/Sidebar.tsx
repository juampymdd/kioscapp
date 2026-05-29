import {
  ShoppingCart, Package, Boxes, Truck, BarChart2, LogOut, Store, Settings,
  type LucideIcon,
} from 'lucide-react'
import type { Caja } from '@kioscapp/shared'

export type ScreenId = 'pos' | 'productos' | 'stock' | 'proveedores' | 'reportes'

interface NavItem {
  id: ScreenId
  Icon: LucideIcon
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'pos',         Icon: ShoppingCart, label: 'Ventas'      },
  { id: 'productos',   Icon: Package,      label: 'Productos'   },
  { id: 'stock',       Icon: Boxes,        label: 'Stock'       },
  { id: 'proveedores', Icon: Truck,        label: 'Proveedores' },
  { id: 'reportes',    Icon: BarChart2,    label: 'Reportes'    },
]

interface Props {
  currentScreen: ScreenId
  onNavigate: (screen: ScreenId) => void
  cajaActiva: Caja | null
  onCerrarCaja: () => void
  onConfig: () => void
}

export default function Sidebar({ currentScreen, onNavigate, cajaActiva, onCerrarCaja, onConfig }: Props) {
  return (
    <aside className="w-14 shrink-0 flex flex-col bg-slate-900 border-r border-slate-800">
      {/* Logo */}
      <div className="flex items-center justify-center h-12 border-b border-slate-800">
        <Store size={20} className="text-blue-400" />
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-1 py-2 px-1">
        {NAV_ITEMS.map(({ id, Icon, label }) => {
          const active = currentScreen === id
          return (
            <button
              key={id}
              title={label}
              onClick={() => onNavigate(id)}
              className={`group relative flex items-center justify-center w-full h-10 rounded-lg
                          transition-colors cursor-pointer
                          ${active
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                          }`}
            >
              <Icon size={18} />
              {/* Tooltip */}
              <span className="absolute left-full ml-2 px-2 py-1 bg-slate-700 text-white text-xs
                               rounded whitespace-nowrap opacity-0 group-hover:opacity-100
                               pointer-events-none transition-opacity z-50">
                {label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* Caja info + cerrar */}
      <div className="border-t border-slate-800 py-2 px-1 flex flex-col gap-1">
        {cajaActiva && (
          <div className="text-center">
            <span className="text-slate-600 text-[10px] font-mono block truncate px-1">
              {cajaActiva.id.slice(0, 6)}
            </span>
          </div>
        )}
        <button
          title="Configuración"
          onClick={onConfig}
          className="group relative flex items-center justify-center w-full h-10 rounded-lg
                     text-slate-500 hover:bg-slate-800 hover:text-white
                     transition-colors cursor-pointer"
        >
          <Settings size={18} />
          <span className="absolute left-full ml-2 px-2 py-1 bg-slate-700 text-white text-xs
                           rounded whitespace-nowrap opacity-0 group-hover:opacity-100
                           pointer-events-none transition-opacity z-50">
            Configuración
          </span>
        </button>
        <button
          title="Cerrar caja"
          onClick={onCerrarCaja}
          className="group relative flex items-center justify-center w-full h-10 rounded-lg
                     text-slate-500 hover:bg-red-900/40 hover:text-red-400
                     transition-colors cursor-pointer"
        >
          <LogOut size={18} />
          <span className="absolute left-full ml-2 px-2 py-1 bg-slate-700 text-white text-xs
                           rounded whitespace-nowrap opacity-0 group-hover:opacity-100
                           pointer-events-none transition-opacity z-50">
            Cerrar caja
          </span>
        </button>
      </div>
    </aside>
  )
}
