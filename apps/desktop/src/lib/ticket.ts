export interface ItemTicket {
  descripcion: string
  cantidad: number
  precio_unit_centavos: number
  subtotal_centavos: number
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

const W = 42

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
  | { tipo: 'texto';   texto: string; negrita?: boolean; centrado?: boolean }
  | { tipo: 'sep';     char: '=' | '-' }

export function buildLineas(d: DatosTicket): LineaTicket[] {
  const lines: LineaTicket[] = []

  lines.push({ tipo: 'texto', texto: center(d.nombre_comercio), negrita: true, centrado: true })
  lines.push({ tipo: 'texto', texto: center(d.fecha), centrado: true })
  lines.push({ tipo: 'sep', char: '=' })

  for (const item of d.items) {
    const desc = item.descripcion.length > 22 ? item.descripcion.slice(0, 22) : item.descripcion
    const qty  = Number.isInteger(item.cantidad) ? `x${item.cantidad}` : `x${item.cantidad.toFixed(2)}`
    lines.push({ tipo: 'texto', texto: rightAlign(`${desc} ${qty}`, pesos(item.subtotal_centavos)) })
  }

  lines.push({ tipo: 'sep', char: '-' })

  if (d.descuento_centavos > 0) {
    lines.push({ tipo: 'texto', texto: rightAlign('DESCUENTO:', pesos(d.descuento_centavos)) })
  }

  lines.push({ tipo: 'texto', texto: rightAlign('TOTAL:', pesos(d.total_centavos)), negrita: true })

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
