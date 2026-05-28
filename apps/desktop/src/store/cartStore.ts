import { create } from 'zustand'
import type { Producto } from '@kioscapp/shared'

export interface CartItem {
  producto: Producto
  cantidad: number
  subtotal_centavos: number
}

interface CartStore {
  items: CartItem[]
  descuento_centavos: number
  addItem: (producto: Producto, cantidad?: number) => void
  removeItem: (productoId: string) => void
  updateCantidad: (productoId: string, cantidad: number) => void
  setDescuento: (centavos: number) => void
  clear: () => void
  subtotal: () => number
  total: () => number
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  descuento_centavos: 0,

  addItem(producto, cantidad = 1) {
    set(state => {
      const existing = state.items.find(i => i.producto.id === producto.id)
      if (existing) {
        return {
          items: state.items.map(i =>
            i.producto.id === producto.id
              ? {
                  ...i,
                  cantidad: i.cantidad + cantidad,
                  subtotal_centavos: Math.floor(
                    (i.cantidad + cantidad) * i.producto.precio_centavos,
                  ),
                }
              : i,
          ),
        }
      }
      return {
        items: [
          ...state.items,
          {
            producto,
            cantidad,
            subtotal_centavos: Math.floor(cantidad * producto.precio_centavos),
          },
        ],
      }
    })
  },

  removeItem(productoId) {
    set(state => ({ items: state.items.filter(i => i.producto.id !== productoId) }))
  },

  updateCantidad(productoId, cantidad) {
    if (cantidad <= 0) {
      get().removeItem(productoId)
      return
    }
    set(state => ({
      items: state.items.map(i =>
        i.producto.id === productoId
          ? {
              ...i,
              cantidad,
              subtotal_centavos: Math.floor(cantidad * i.producto.precio_centavos),
            }
          : i,
      ),
    }))
  },

  setDescuento(centavos) {
    set({ descuento_centavos: Math.max(0, centavos) })
  },

  clear() {
    set({ items: [], descuento_centavos: 0 })
  },

  subtotal() {
    return get().items.reduce((acc, i) => acc + i.subtotal_centavos, 0)
  },

  total() {
    return Math.max(0, get().subtotal() - get().descuento_centavos)
  },
}))
