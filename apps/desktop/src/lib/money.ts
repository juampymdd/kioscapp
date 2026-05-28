const fmt = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
})

/** 1550 → '$15,50' */
export function formatCentavos(centavos: number): string {
  return fmt.format(centavos / 100)
}

/** '$15,50' | '15.50' | '15,50' → 1550 */
export function parseCentavos(input: string): number {
  const clean = input.replace(/[^0-9,.-]/g, '').replace(',', '.')
  return Math.round(parseFloat(clean) * 100) || 0
}

/** 1550 → '15,50' (sin símbolo, para inputs) */
export function centavosToInputStr(centavos: number): string {
  return (centavos / 100).toFixed(2).replace('.', ',')
}
