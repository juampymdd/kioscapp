import { describe, it, expect } from 'vitest'
import { resolverDescuento, type DescuentoItemInput } from './descuentos'
import type { Descuento } from './types/descuento'

const item: DescuentoItemInput = {
  producto_id: 'p1',
  categoria: 'bebidas',
  subtotal_centavos: 1000,
}

function desc(p: Partial<Descuento>): Descuento {
  return {
    id: 'd', user_id: 'u', sucursal_id: null, objetivo: 'categoria',
    producto_id: null, categoria: 'bebidas', tipo: 'monto', valor: 100,
    activo: true, created_at: '', updated_at: '', deleted_at: null, ...p,
  }
}

describe('resolverDescuento', () => {
  it('sin manual ni catálogo → 0 / null', () => {
    expect(resolverDescuento(item, null, [])).toEqual({ centavos: 0, origen: null, detalle: null })
  })

  it('promo del catálogo gana sobre el manual (read-only)', () => {
    const cat = [desc({ tipo: 'monto', valor: 300, objetivo: 'producto', producto_id: 'p1' })]
    expect(resolverDescuento(item, 200, cat)).toEqual({ centavos: 300, origen: 'promo', detalle: null })
  })

  it('manual aplica solo cuando no hay promo', () => {
    expect(resolverDescuento(item, 200, [])).toEqual({ centavos: 200, origen: 'manual', detalle: null })
  })

  it('monto se aplica tal cual', () => {
    expect(resolverDescuento(item, null, [desc({ tipo: 'monto', valor: 150 })])).toEqual({ centavos: 150, origen: 'promo', detalle: null })
  })

  it('porcentaje = floor(subtotal * valor / 100), con detalle', () => {
    expect(resolverDescuento(item, null, [desc({ tipo: 'porcentaje', valor: 10 })])).toEqual({ centavos: 100, origen: 'promo', detalle: '10%' })
  })

  it('clampa el descuento al subtotal', () => {
    expect(resolverDescuento(item, 5000, [])).toEqual({ centavos: 1000, origen: 'manual', detalle: null })
    expect(resolverDescuento(item, null, [desc({ tipo: 'monto', valor: 5000 })])).toEqual({ centavos: 1000, origen: 'promo', detalle: null })
  })

  it('sucursal gana sobre global', () => {
    const cat = [
      desc({ id: 'g', sucursal_id: null, tipo: 'monto', valor: 100 }),
      desc({ id: 's', sucursal_id: 'suc1', tipo: 'monto', valor: 300 }),
    ]
    expect(resolverDescuento(item, null, cat)).toEqual({ centavos: 300, origen: 'promo', detalle: null })
  })

  it('producto gana sobre categoría dentro del mismo scope', () => {
    const cat = [
      desc({ id: 'c', objetivo: 'categoria', categoria: 'bebidas', tipo: 'monto', valor: 100 }),
      desc({ id: 'p', objetivo: 'producto', producto_id: 'p1', categoria: null, tipo: 'monto', valor: 250 }),
    ]
    expect(resolverDescuento(item, null, cat)).toEqual({ centavos: 250, origen: 'promo', detalle: null })
  })

  it('ignora descuentos que no matchean ni los inactivos → cae al manual', () => {
    const cat = [
      desc({ objetivo: 'producto', producto_id: 'otro', categoria: null, valor: 999 }),
      desc({ categoria: 'golosinas', valor: 999 }),
      desc({ categoria: 'bebidas', valor: 100, activo: false }),
    ]
    expect(resolverDescuento(item, 200, cat)).toEqual({ centavos: 200, origen: 'manual', detalle: null })
  })
})
