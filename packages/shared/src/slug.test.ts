import { describe, it, expect } from 'vitest'
import { normalizarSlug } from './slug'

describe('normalizarSlug', () => {
  it('minúsculas, sin acentos, guiones bajos', () => {
    expect(normalizarSlug('Bebidas Frías')).toBe('bebidas_frias')
  })
  it('colapsa separadores y recorta', () => {
    expect(normalizarSlug('  Pan / Factura  ')).toBe('pan_factura')
  })
  it('vacío → "categoria"', () => {
    expect(normalizarSlug('!!!')).toBe('categoria')
  })
})
