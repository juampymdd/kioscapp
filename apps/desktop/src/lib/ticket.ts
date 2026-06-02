import type { CategoriaProducto } from '@kioscapp/shared'
import { CATEGORIA_LABEL, CATEGORIA_ORDEN } from '@kioscapp/shared'

export interface ItemTicket {
  descripcion: string
  cantidad: number
  precio_unit_centavos: number
  categoria: CategoriaProducto
  subtotal_centavos: number
  descuento_centavos: number
  descuento_origen?: 'promo' | 'manual' | null
  descuento_detalle?: string | null
}

export interface DatosTicket {
  nombre_comercio: string
  fecha: string
  items: ItemTicket[]
  total_centavos: number
  descuento_centavos: number
  medio_pago: string
  monto_recibido_centavos: number
  vuelto_centavos: number
}

const W = 32

function pesos(centavos: number): string {
  const abs = Math.abs(centavos)
  const sign = centavos < 0 ? '-' : ''
  const p = Math.floor(abs / 100)
  const c = abs % 100
  return c === 0 ? `${sign}$${p}` : `${sign}$${p}.${String(c).padStart(2, '0')}`
}

function rightAlign(left: string, right: string): string {
  const spaces = Math.max(1, W - left.length - right.length)
  return left + ' '.repeat(spaces) + right
}

function center(s: string): string {
  const pad = Math.max(0, Math.floor((W - s.length) / 2))
  return ' '.repeat(pad) + s
}

export type LineaTicket =
  | { tipo: 'texto';   texto: string; negrita?: boolean; centrado?: boolean; grande?: boolean }
  | { tipo: 'sep';     char: '=' | '-' }

export function buildLineas(d: DatosTicket): LineaTicket[] {
  const lines: LineaTicket[] = []

  lines.push({ tipo: 'texto', texto: center(d.nombre_comercio), negrita: true, centrado: true })
  lines.push({ tipo: 'texto', texto: center(d.fecha), centrado: true })
  lines.push({ tipo: 'sep', char: '=' })

  // Agrupado por categoría (orden fijo). Por ítem: nombre / "cant x unit ... total"
  // / "-descuento" (solo si hay descuento).
  for (const cat of CATEGORIA_ORDEN) {
    const items = d.items.filter(i => i.categoria === cat)
    if (items.length === 0) continue

    lines.push({ tipo: 'texto', texto: CATEGORIA_LABEL[cat], negrita: true })

    for (const item of items) {
      const cant = Number.isInteger(item.cantidad) ? `${item.cantidad}` : item.cantidad.toFixed(2)
      const desc = item.descripcion.length > W ? item.descripcion.slice(0, W) : item.descripcion
      lines.push({ tipo: 'texto', texto: desc })
      lines.push({ tipo: 'texto', texto: rightAlign(`${cant} x ${pesos(item.precio_unit_centavos)}`, pesos(item.subtotal_centavos)) })
      if (item.descuento_centavos > 0) {
        const base = item.descuento_origen === 'promo' ? 'Promo' : 'Desc.'
        const etiqueta = item.descuento_detalle ? `${base} ${item.descuento_detalle}` : base
        lines.push({ tipo: 'texto', texto: rightAlign(`  ${etiqueta}`, `-${pesos(item.descuento_centavos)}`) })
      }
    }
  }

  lines.push({ tipo: 'sep', char: '-' })

  if (d.descuento_centavos > 0) {
    lines.push({ tipo: 'texto', texto: rightAlign('DESCUENTO:', pesos(d.descuento_centavos)) })
  }

  lines.push({ tipo: 'texto', texto: rightAlign('TOTAL:', pesos(d.total_centavos)), negrita: true, grande: true })

  const medioLabel: Record<string, string> = {
    efectivo:        'Efectivo',
    debito:          'Debito',
    credito:         'Credito',
    qr_mercado_pago: 'QR / Mercado Pago',
  }
  lines.push({ tipo: 'texto', texto: rightAlign('MEDIO DE PAGO:', medioLabel[d.medio_pago] ?? d.medio_pago) })

  if (d.medio_pago === 'efectivo') {
    if (d.monto_recibido_centavos > 0) {
      lines.push({ tipo: 'texto', texto: rightAlign('RECIBIDO:', pesos(d.monto_recibido_centavos)) })
    }
    if (d.vuelto_centavos > 0) {
      lines.push({ tipo: 'texto', texto: rightAlign('VUELTO:', pesos(d.vuelto_centavos)) })
    }
  }

  lines.push({ tipo: 'sep', char: '=' })
  lines.push({ tipo: 'texto', texto: center('Gracias por su compra!'), centrado: true })

  return lines
}
