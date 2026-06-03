import { formatCentavos } from './money'

export interface LineaPedido {
  descripcion: string
  cantidad: number
  costo_unit_centavos: number
  subtotal_centavos: number
}

function fmtCant(n: number): string {
  return Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(3)))
}

export interface DatosPedido {
  proveedor: string
  comercio: string
  fecha: string
  items: LineaPedido[]
  total_centavos: number
}

/** Texto del pedido para copiar / WhatsApp / imprimir. */
export function pedidoTexto(d: DatosPedido): string {
  const lineas = d.items.map(i => `- ${fmtCant(i.cantidad)}x ${i.descripcion}`)
  return [
    `Pedido - ${d.comercio}`,
    `Proveedor: ${d.proveedor}`,
    d.fecha,
    '',
    ...lineas,
    '',
    `Total aprox: ${formatCentavos(d.total_centavos)}`,
  ].join('\n')
}
