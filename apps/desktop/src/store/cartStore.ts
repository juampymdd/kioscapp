import { create } from 'zustand'
import type { Producto, Descuento } from '@kioscapp/shared'
import { resolverDescuento, type OrigenDescuento } from '@kioscapp/shared'

export interface CartItem {
  producto: Producto
  cantidad: number
  /** Precio unitario efectivo: el override (precio variable) o el del producto. */
  precio_unit_centavos: number
  /** Monto fijado al vender para precio variable (centavos). null = usar producto. */
  precioOverride_centavos: number | null
  subtotal_centavos: number
  /** Descuento manual fijado por el cajero (centavos). null = sin override manual. */
  descuentoManual_centavos: number | null
  /** Detalle del manual (ej '10%'); null si fue monto fijo. */
  descuentoManual_detalle: string | null
  /** Descuento efectivo resuelto (promo o manual), congelable al vender. */
  descuento_centavos: number
  /** Origen del descuento efectivo: 'promo' (catálogo) | 'manual' | null. */
  descuento_origen: OrigenDescuento | null
  /** Detalle del tipo efectivo (ej '10%'); null si monto fijo o sin descuento. */
  descuento_detalle: string | null
  /** Id de la promo aplicada (para asentar el movimiento). null si manual/sin descuento. */
  descuento_promo_id: string | null
}

interface CartStore {
  items: CartItem[]
  descuento_centavos: number          // descuento global manual de la venta
  catalogo: Descuento[]               // catálogo bajado del central
  medio: string | null                // medio de pago elegido en el cobro (null = aún no)
  addItem: (producto: Producto, cantidad?: number, precioUnit?: number) => void
  removeItem: (productoId: string) => void
  updateCantidad: (productoId: string, cantidad: number) => void
  setDescuentoManualItem: (productoId: string, centavos: number | null, detalle?: string | null) => void
  setDescuento: (centavos: number) => void
  setCatalogo: (catalogo: Descuento[]) => void
  setMedioPago: (medio: string | null) => void
  clear: () => void
  subtotal: () => number
  descuentoItems: () => number
  total: () => number
}

/** Recalcula subtotal y descuento efectivo (con origen + detalle) de un ítem. */
function recalcItem(item: CartItem, catalogo: Descuento[], medio: string | null): CartItem {
  // Redondear a 3 decimales evita el drift de float del stepper (0.1 + 0.1 + ...).
  const cantidad = Math.round(item.cantidad * 1000) / 1000
  item = { ...item, cantidad }
  const precio_unit_centavos = item.precioOverride_centavos ?? item.producto.precio_centavos
  const subtotal_centavos = Math.floor(cantidad * precio_unit_centavos)
  const { centavos, origen, detalle, promoId } = resolverDescuento(
    { producto_id: item.producto.id, categoria: item.producto.categoria, subtotal_centavos },
    item.descuentoManual_centavos,
    catalogo,
    { fecha: new Date(), medio },
  )
  // El detalle del manual lo aporta el carrito (resolver no conoce el modo %/$).
  const descuento_detalle = origen === 'manual' ? item.descuentoManual_detalle : detalle
  return { ...item, precio_unit_centavos, subtotal_centavos, descuento_centavos: centavos, descuento_origen: origen, descuento_detalle, descuento_promo_id: promoId }
}

/** ¿El ítem tiene una promo de catálogo aplicada? (manual queda bloqueado) */
export function tienePromo(item: CartItem): boolean {
  return item.descuento_origen === 'promo'
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  descuento_centavos: 0,
  catalogo: [],
  medio: null,

  addItem(producto, cantidad = 1, precioUnit) {
    set(state => {
      const existing = state.items.find(i => i.producto.id === producto.id)
      const base = {
        producto,
        precio_unit_centavos: 0,
        precioOverride_centavos: precioUnit ?? null,
        subtotal_centavos: 0,
        descuentoManual_centavos: null, descuentoManual_detalle: null,
        descuento_centavos: 0, descuento_origen: null, descuento_detalle: null, descuento_promo_id: null,
      }

      // Precio variable (monto tipeado al vender): línea única, cantidad 1.
      // Re-agregar reemplaza el monto en vez de acumular cantidades.
      if (precioUnit != null) {
        const linea = recalcItem({ ...base, cantidad: 1 }, state.catalogo, state.medio)
        const items = existing
          ? state.items.map(i => i.producto.id === producto.id ? linea : i)
          : [...state.items, linea]
        return { items }
      }

      const items = existing
        ? state.items.map(i => i.producto.id === producto.id
            ? recalcItem({ ...i, cantidad: i.cantidad + cantidad }, state.catalogo, state.medio)
            : i)
        : [...state.items, recalcItem({ ...base, cantidad }, state.catalogo, state.medio)]
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
        i.producto.id === productoId ? recalcItem({ ...i, cantidad }, state.catalogo, state.medio) : i),
    }))
  },

  setDescuentoManualItem(productoId, centavos, detalle = null) {
    set(state => ({
      items: state.items.map(i =>
        i.producto.id === productoId
          ? recalcItem({ ...i, descuentoManual_centavos: centavos, descuentoManual_detalle: detalle }, state.catalogo, state.medio)
          : i),
    }))
  },

  setDescuento(centavos) { set({ descuento_centavos: Math.max(0, centavos) }) },

  setCatalogo(catalogo) {
    set(state => ({ catalogo, items: state.items.map(i => recalcItem(i, catalogo, state.medio)) }))
  },

  setMedioPago(medio) {
    set(state => ({ medio, items: state.items.map(i => recalcItem(i, state.catalogo, medio)) }))
  },

  clear() { set({ items: [], descuento_centavos: 0, medio: null }) },

  subtotal() { return get().items.reduce((acc, i) => acc + i.subtotal_centavos, 0) },
  descuentoItems() { return get().items.reduce((acc, i) => acc + i.descuento_centavos, 0) },
  total() {
    return Math.max(0, get().subtotal() - get().descuentoItems() - get().descuento_centavos)
  },
}))
