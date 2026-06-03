'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Receipt, Wallet, Boxes, Package, Tags, Truck, Tag, ShoppingBag } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const ITEMS: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: '/dashboard',             label: 'Resumen',     Icon: LayoutDashboard },
  { href: '/dashboard/ventas',      label: 'Ventas',      Icon: Receipt },
  { href: '/dashboard/cajas',       label: 'Cajas',       Icon: Wallet },
  { href: '/dashboard/stock',       label: 'Stock',       Icon: Boxes },
  { href: '/dashboard/productos',   label: 'Productos',   Icon: Package },
  { href: '/dashboard/categorias',  label: 'Categorías',  Icon: Tags },
  { href: '/dashboard/proveedores', label: 'Proveedores', Icon: Truck },
  { href: '/dashboard/compras',     label: 'Compras',     Icon: ShoppingBag },
  { href: '/dashboard/descuentos',  label: 'Promociones', Icon: Tag },
]

export default function DashboardNav() {
  const path = usePathname()
  return (
    <nav className="flex items-center gap-1 overflow-x-auto">
      {ITEMS.map(({ href, label, Icon }) => {
        const active = href === '/dashboard' ? path === '/dashboard' : path.startsWith(href)
        return (
          <Link key={href} href={href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors
              ${active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Icon size={15} /> {label}
          </Link>
        )
      })}
    </nav>
  )
}
