import { describe, it, expect } from 'vitest'
import { resolverDescuento, promoVigente, type DescuentoItemInput } from './descuentos'
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
    expect(resolverDescuento(item, null, [])).toEqual({ centavos: 0, origen: null, detalle: null, promoId: null })
  })

  it('promo del catálogo gana sobre el manual (read-only)', () => {
    const cat = [desc({ id: 'd', tipo: 'monto', valor: 300, objetivo: 'producto', producto_id: 'p1' })]
    expect(resolverDescuento(item, 200, cat)).toEqual({ centavos: 300, origen: 'promo', detalle: null, promoId: 'd' })
  })

  it('manual aplica solo cuando no hay promo', () => {
    expect(resolverDescuento(item, 200, [])).toEqual({ centavos: 200, origen: 'manual', detalle: null, promoId: null })
  })

  it('monto se aplica tal cual', () => {
    expect(resolverDescuento(item, null, [desc({ id: 'd', tipo: 'monto', valor: 150 })])).toEqual({ centavos: 150, origen: 'promo', detalle: null, promoId: 'd' })
  })

  it('porcentaje = floor(subtotal * valor / 100), con detalle', () => {
    expect(resolverDescuento(item, null, [desc({ id: 'd', tipo: 'porcentaje', valor: 10 })])).toEqual({ centavos: 100, origen: 'promo', detalle: '10%', promoId: 'd' })
  })

  it('clampa el descuento al subtotal', () => {
    expect(resolverDescuento(item, 5000, [])).toEqual({ centavos: 1000, origen: 'manual', detalle: null, promoId: null })
    expect(resolverDescuento(item, null, [desc({ id: 'd', tipo: 'monto', valor: 5000 })])).toEqual({ centavos: 1000, origen: 'promo', detalle: null, promoId: 'd' })
  })

  it('sucursal gana sobre global', () => {
    const cat = [
      desc({ id: 'g', sucursal_id: null, tipo: 'monto', valor: 100 }),
      desc({ id: 's', sucursal_id: 'suc1', tipo: 'monto', valor: 300 }),
    ]
    expect(resolverDescuento(item, null, cat)).toEqual({ centavos: 300, origen: 'promo', detalle: null, promoId: 's' })
  })

  it('producto gana sobre categoría dentro del mismo scope', () => {
    const cat = [
      desc({ id: 'c', objetivo: 'categoria', categoria: 'bebidas', tipo: 'monto', valor: 100 }),
      desc({ id: 'p', objetivo: 'producto', producto_id: 'p1', categoria: null, tipo: 'monto', valor: 250 }),
    ]
    expect(resolverDescuento(item, null, cat)).toEqual({ centavos: 250, origen: 'promo', detalle: null, promoId: 'p' })
  })

  it('ignora descuentos que no matchean ni los inactivos → cae al manual', () => {
    const cat = [
      desc({ objetivo: 'producto', producto_id: 'otro', categoria: null, valor: 999 }),
      desc({ categoria: 'golosinas', valor: 999 }),
      desc({ categoria: 'bebidas', valor: 100, activo: false }),
    ]
    expect(resolverDescuento(item, 200, cat)).toEqual({ centavos: 200, origen: 'manual', detalle: null, promoId: null })
  })
})

describe('promoVigente', () => {
  // 2026-06-03 es miércoles (getDay()=3), 19:00
  const miercoles19 = new Date(2026, 5, 3, 19, 0)
  const jueves19    = new Date(2026, 5, 4, 19, 0)

  it('sin condiciones → siempre vigente', () => {
    expect(promoVigente(desc({}), { fecha: jueves19, medio: 'efectivo' })).toBe(true)
  })

  it('día de semana: miércoles sí, jueves no', () => {
    const d = desc({ dias_semana: '3' })
    expect(promoVigente(d, { fecha: miercoles19, medio: null })).toBe(true)
    expect(promoVigente(d, { fecha: jueves19, medio: null })).toBe(false)
  })

  it('rango de fechas: dentro sí, fuera no', () => {
    const d = desc({ vigencia_desde: '2026-06-01', vigencia_hasta: '2026-06-03' })
    expect(promoVigente(d, { fecha: miercoles19, medio: null })).toBe(true)
    expect(promoVigente(d, { fecha: jueves19, medio: null })).toBe(false)
  })

  it('franja horaria: dentro sí, fuera no', () => {
    const d = desc({ hora_desde: 18 * 60, hora_hasta: 20 * 60 })
    expect(promoVigente(d, { fecha: miercoles19, medio: null })).toBe(true)
    expect(promoVigente(d, { fecha: new Date(2026, 5, 3, 21, 0), medio: null })).toBe(false)
  })

  it('medio de pago: coincide sí, distinto no, pendiente (null) no', () => {
    const d = desc({ medio_pago: 'efectivo' })
    expect(promoVigente(d, { fecha: jueves19, medio: 'efectivo' })).toBe(true)
    expect(promoVigente(d, { fecha: jueves19, medio: 'debito' })).toBe(false)
    expect(promoVigente(d, { fecha: jueves19, medio: null })).toBe(false)
  })

  it('resolver aplica la promo solo si está vigente', () => {
    const cat = [desc({ id: 'd', tipo: 'porcentaje', valor: 10, dias_semana: '3', medio_pago: 'efectivo' })]
    // miércoles + efectivo → 10% de 1000 = 100
    expect(resolverDescuento(item, null, cat, { fecha: miercoles19, medio: 'efectivo' }))
      .toEqual({ centavos: 100, origen: 'promo', detalle: '10%', promoId: 'd' })
    // miércoles pero débito → no aplica
    expect(resolverDescuento(item, null, cat, { fecha: miercoles19, medio: 'debito' }))
      .toEqual({ centavos: 0, origen: null, detalle: null, promoId: null })
    // jueves → no aplica
    expect(resolverDescuento(item, null, cat, { fecha: jueves19, medio: 'efectivo' }))
      .toEqual({ centavos: 0, origen: null, detalle: null, promoId: null })
  })
})
