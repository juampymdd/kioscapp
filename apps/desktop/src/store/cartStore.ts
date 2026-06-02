import { create } from 'zustand'
import type { Producto, Descuento } from '@kioscapp/shared'
import { resolverDescuento, type OrigenDescuento } from '@kioscapp/shared'

export interface CartItem {
  producto: Producto
  cantidad: number
  subtotal_centavos: number
  /** Descuento manual fijado por el cajero (centavos). null = sin override manual. */
  descuentoManual_centavos: number | null
  /** Descuento efectivo resuelto (promo o manual), congelable al vender. */
  descuento_centavos: number
  /** Origen del descuento efectivo: 'promo' (catálogo) | 'manual' | null. */
  descuento_origen: OrigenDescuento | null
}

interface CartStore {
  items: CartItem[]
  descuento_centavos: number          // descuento global manual de la venta
  catalogo: Descuento[]               // catálogo bajado del central
  addItem: (producto: Producto, cantidad?: number) => void
  removeItem: (productoId: string) => void
  updateCantidad: (productoId: string, cantidad: number) => void
  setDescuentoManualItem: (productoId: string, centavos: number | null) => void
  setDescuento: (centavos: number) => void
  setCatalogo: (catalogo: Descuento[]) => void
  clear: () => void
  subtotal: () => number
  descuentoItems: () => number
  total: () => number
}

/** Recalcula subtotal y descuento efectivo (con origen) de un ítem. */
function recalcItem(item: CartItem, catalogo: Descuento[]): CartItem {
  const subtotal_centavos = Math.floor(item.cantidad * item.producto.precio_centavos)
  const { centavos, origen } = resolverDescuento(
    { producto_id: item.producto.id, categoria: item.producto.categoria, subtotal_centavos },
    item.descuentoManual_centavos,
    catalogo,
  )
  return { ...item, subtotal_centavos, descuento_centavos: centavos, descuento_origen: origen }
}

/** ¿El ítem tiene una promo de catálogo aplicada? (manual queda bloqueado) */
export function tienePromo(item: CartItem): boolean {
  return item.descuento_origen === 'promo'
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  descuento_centavos: 0,
  catalogo: [],

  addItem(producto, cantidad = 1) {
    set(state => {
      const existing = state.items.find(i => i.producto.id === producto.id)
      const items = existing
        ? state.items.map(i => i.producto.id === producto.id
            ? recalcItem({ ...i, cantidad: i.cantidad + cantidad }, state.catalogo)
            : i)
        : [...state.items, recalcItem(
            { producto, cantidad, subtotal_centavos: 0, descuentoManual_centavos: null, descuento_centavos: 0, descuento_origen: null },
            state.catalogo,
          )]
      return { items }
    })
  },

  removeItem(productoId) {
    set(state => ({ items: state.items.filter(i => i.producto.id !== productoId) }))
  },

  updateCantidad(productoId, cantidad) {
    if (cantidad <= 0) { get().removeItem(productoId); return }
    set(state => ({
      items: state.items.map(i =>
        i.producto.id === productoId ? recalcItem({ ...i, cantidad }, state.catalogo) : i),
    }))
  },

  setDescuentoManualItem(productoId, centavos) {
    set(state => ({
      items: state.items.map(i =>
        i.producto.id === productoId
          ? recalcItem({ ...i, descuentoManual_centavos: centavos }, state.catalogo)
          : i),
    }))
  },

  setDescuento(centavos) { set({ descuento_centavos: Math.max(0, centavos) }) },

  setCatalogo(catalogo) {
    set(state => ({ catalogo, items: state.items.map(i => recalcItem(i, catalogo)) }))
  },

  clear() { set({ items: [], descuento_centavos: 0 }) },

  subtotal() { return get().items.reduce((acc, i) => acc + i.subtotal_centavos, 0) },
  descuentoItems() { return get().items.reduce((acc, i) => acc + i.descuento_centavos, 0) },
  total() {
    return Math.max(0, get().subtotal() - get().descuentoItems() - get().descuento_centavos)
  },
}))
