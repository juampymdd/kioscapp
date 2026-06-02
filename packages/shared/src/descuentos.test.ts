import { describe, it, expect } from 'vitest'
import { resolverDescuentoItem, type DescuentoItemInput } from './descuentos'
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

describe('resolverDescuentoItem', () => {
  it('sin manual ni catálogo → 0', () => {
    expect(resolverDescuentoItem(item, null, [])).toBe(0)
  })

  it('manual gana siempre', () => {
    const cat = [desc({ tipo: 'monto', valor: 500, objetivo: 'producto', producto_id: 'p1' })]
    expect(resolverDescuentoItem(item, 200, cat)).toBe(200)
  })

  it('monto se aplica tal cual', () => {
    expect(resolverDescuentoItem(item, null, [desc({ tipo: 'monto', valor: 150 })])).toBe(150)
  })

  it('porcentaje = floor(subtotal * valor / 100)', () => {
    expect(resolverDescuentoItem(item, null, [desc({ tipo: 'porcentaje', valor: 10 })])).toBe(100)
  })

  it('clampa el descuento al subtotal', () => {
    expect(resolverDescuentoItem(item, 5000, [])).toBe(1000)
    expect(resolverDescuentoItem(item, null, [desc({ tipo: 'monto', valor: 5000 })])).toBe(1000)
  })

  it('sucursal gana sobre global', () => {
    const cat = [
      desc({ id: 'g', sucursal_id: null, tipo: 'monto', valor: 100 }),
      desc({ id: 's', sucursal_id: 'suc1', tipo: 'monto', valor: 300 }),
    ]
    expect(resolverDescuentoItem(item, null, cat)).toBe(300)
  })

  it('producto gana sobre categoría dentro del mismo scope', () => {
    const cat = [
      desc({ id: 'c', objetivo: 'categoria', categoria: 'bebidas', tipo: 'monto', valor: 100 }),
      desc({ id: 'p', objetivo: 'producto', producto_id: 'p1', categoria: null, tipo: 'monto', valor: 250 }),
    ]
    expect(resolverDescuentoItem(item, null, cat)).toBe(250)
  })

  it('ignora descuentos que no matchean ni los inactivos', () => {
    const cat = [
      desc({ objetivo: 'producto', producto_id: 'otro', categoria: null, valor: 999 }),
      desc({ categoria: 'golosinas', valor: 999 }),
      desc({ categoria: 'bebidas', valor: 100, activo: false }),
    ]
    expect(resolverDescuentoItem(item, null, cat)).toBe(0)
  })
})
