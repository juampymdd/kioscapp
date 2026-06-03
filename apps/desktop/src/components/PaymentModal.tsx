import { useEffect, useState } from 'react'
import { X, Banknote, CreditCard, QrCode } from 'lucide-react'
import MoneyInput from './MoneyInput'
import TicketModal from './TicketModal'
import type { MedioPago, Venta, VentaItem } from '@kioscapp/shared'
import type { DatosTicket, AnchoPapel } from '../lib/ticket'
import { useCartStore } from '../store/cartStore'
import { useCajaStore } from '../store/cajaStore'
import { getDataStore } from '../store/dataStore'
import { formatCentavos } from '../lib/money'
import { promoEtiqueta } from '@kioscapp/shared'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

import type { LucideIcon } from 'lucide-react'
const MEDIOS: { id: MedioPago; label: string; Icon: LucideIcon }[] = [
  { id: 'efectivo',        label: 'Efectivo', Icon: Banknote    },
  { id: 'debito',          label: 'Débito',   Icon: CreditCard  },
  { id: 'credito',         label: 'Crédito',  Icon: CreditCard  },
  { id: 'qr_mercado_pago', label: 'QR / MP',  Icon: QrCode      },
]

export default function PaymentModal({ onClose, onSuccess }: Props) {
  const { items, total, subtotal, descuento_centavos, catalogo, clear, setDescuento, setMedioPago } = useCartStore()
  const { cajaActiva } = useCajaStore()
  const [medio, setMedio]           = useState<MedioPago>('efectivo')
  const [mostrarDescuento, setMostrarDescuento] = useState(false)
  const [recibido, setRecibido]     = useState(0)
  const [procesando, setProcesando] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  // Ticket step
  const [ticketDatos, setTicketDatos] = useState<DatosTicket | null>(null)
  const [impresora, setImpresora]     = useState<string | null>(null)
  const [anchoPapel, setAnchoPapel]   = useState<AnchoPapel>('58')

  useEffect(() => {
    getDataStore().getConfig('impresora').then(v => setImpresora(v))
    getDataStore().getConfig('ancho_papel').then(v => setAnchoPapel(v === '80' ? '80' : '58'))
    // getConfig may return null if not configured
  }, [])

  // Aplicar el medio elegido al carrito (promos condicionales al medio). Al
  // desmontar (cerrar/cobrar), volver a null para no dejar promos colgadas en el POS.
  useEffect(() => {
    setMedioPago(medio)
    return () => setMedioPago(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medio])

  const totalCentavos    = total()
  // Descuento efectivo = lo que realmente baja del subtotal (clampa ≤ subtotal).
  const descuentoTotal   = subtotal() - totalCentavos
  const vueltoCentavos   = medio === 'efectivo' ? Math.max(0, recibido - totalCentavos) : 0
  const puedeConfirmar   = medio !== 'efectivo' || recibido >= totalCentavos

  async function confirmar() {
    if (!cajaActiva) return
    setProcesando(true)
    setError(null)
    try {
      const store   = getDataStore()
      const ts      = new Date().toISOString()
      const localId = (await store.getConfig('local_id')) ?? 'local-demo'
      const nombreComercio = (await store.getConfig('nombre_comercio')) ?? 'KioscApp'
      const cats = await store.getCategorias()
      const ventaId = crypto.randomUUID()

      const venta: Omit<Venta, 'sync_status'> = {
        id: ventaId,
        created_at: ts,
        local_id: localId,
        caja_id: cajaActiva.id,
        total_centavos: totalCentavos,
        descuento_centavos,
        medio_pago: medio,
        monto_recibido_centavos: medio === 'efectivo' ? recibido : totalCentavos,
        vuelto_centavos: vueltoCentavos,
        anulada: false,
        venta_anulacion_id: null,
      }

      const ventaItems: Omit<VentaItem, 'sync_status'>[] = items.map(item => ({
        id: crypto.randomUUID(),
        created_at: ts,
        local_id: localId,
        venta_id: ventaId,
        producto_id: item.producto.id,
        descripcion: item.producto.descripcion,
        precio_unit_centavos: item.precio_unit_centavos,
        categoria: item.producto.categoria,
        cantidad: item.cantidad,
        subtotal_centavos: item.subtotal_centavos,
        descuento_centavos: item.descuento_centavos,
        descuento_origen: item.descuento_origen,
        descuento_detalle: item.descuento_detalle,
      }))

      // Capture ticket data BEFORE clearing the cart
      const datos: DatosTicket = {
        nombre_comercio: nombreComercio,
        fecha: new Date().toLocaleString('es-AR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        }),
        items: items.map(i => ({
          descripcion:          i.producto.descripcion,
          cantidad:             i.cantidad,
          precio_unit_centavos: i.precio_unit_centavos,
          categoria:            i.producto.categoria,
          subtotal_centavos:    i.subtotal_centavos,
          descuento_centavos:   i.descuento_centavos,
          descuento_origen:     i.descuento_origen,
          descuento_detalle:    i.descuento_detalle,
        })),
        total_centavos:             totalCentavos,
        descuento_centavos,
        medio_pago:                 medio,
        monto_recibido_centavos:    medio === 'efectivo' ? recibido : totalCentavos,
        vuelto_centavos:            vueltoCentavos,
        categorias:                 cats.map(c => ({ id: c.id, nombre: c.nombre, orden: c.orden })),
      }

      await store.crearVenta(venta)
      await store.crearVentaItems(ventaItems)

      for (const item of items) {
        await store.decrementarStock(item.producto.id, item.cantidad)
      }

      // Contabilidad: la venta entra en BRUTO y el descuento como movimiento
      // negativo aparte → el neto (bruto − descuento) coincide con lo cobrado.
      const brutoCentavos = totalCentavos + descuentoTotal
      await store.registrarMovimientoCaja({
        id: crypto.randomUUID(),
        caja_id: cajaActiva.id,
        tipo: `venta_${medio === 'efectivo' ? 'efectivo' : medio.replace('_', '')}` as any,
        monto_centavos: brutoCentavos,
        descripcion: `Venta ${ventaId.slice(0, 8)}`,
        created_at: ts,
        updated_at: ts,
        local_id: localId,
        deleted_at: null,
      })

      if (descuentoTotal > 0) {
        // Armar descripción de qué descuentos se aplicaron (promo por id + manual).
        const etiquetas = new Set<string>()
        for (const i of items) {
          if (i.descuento_centavos <= 0) continue
          if (i.descuento_origen === 'manual') {
            etiquetas.add(`Manual${i.descuento_detalle ? ' ' + i.descuento_detalle : ''}`)
          } else if (i.descuento_origen === 'promo' && i.descuento_promo_id) {
            const promo = catalogo.find(d => d.id === i.descuento_promo_id)
            if (promo) {
              const objNombre = promo.objetivo === 'producto'
                ? i.producto.descripcion
                : promo.objetivo === 'categoria'
                  ? (cats.find(c => c.id === promo.categoria)?.nombre ?? promo.categoria ?? '')
                  : ''
              etiquetas.add(promoEtiqueta(promo, objNombre))
            }
          }
        }
        if (descuento_centavos > 0) etiquetas.add(`Manual venta ${formatCentavos(descuento_centavos)}`)
        const detalleDesc = etiquetas.size ? [...etiquetas].join('; ') : 'sin detalle'

        await store.registrarMovimientoCaja({
          id: crypto.randomUUID(),
          caja_id: cajaActiva.id,
          tipo: 'descuento',
          monto_centavos: -descuentoTotal,
          descripcion: `Descuento (${detalleDesc}) · venta ${ventaId.slice(0, 8)}`,
          created_at: ts,
          updated_at: ts,
          local_id: localId,
          deleted_at: null,
        })
      }

      clear()

      // Transition to ticket step
      setTicketDatos(datos)
    } catch (e) {
      setError(String(e))
    } finally {
      setProcesando(false)
    }
  }

  // Show ticket preview after sale
  if (ticketDatos) {
    return (
      <TicketModal
        datos={ticketDatos}
        impresora={impresora}
        ancho={anchoPapel}
        onDone={onSuccess}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-slate-700 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Cobro</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Total + desglose */}
        <div className="bg-slate-800 rounded-xl p-4 mb-6">
          {descuentoTotal > 0 && (
            <div className="space-y-1 mb-3 pb-3 border-b border-slate-700">
              <div className="flex justify-between text-slate-400 text-sm">
                <span>Subtotal</span><span className="tabular-nums">{formatCentavos(subtotal())}</span>
              </div>
              <div className="flex justify-between text-amber-400 text-sm">
                <span>Descuento</span>
                <span className="tabular-nums">− {formatCentavos(descuentoTotal)}</span>
              </div>
            </div>
          )}
          <div className="text-center">
            <p className="text-slate-400 text-sm">Total a cobrar</p>
            <p className="text-blue-400 text-4xl font-bold mt-1 tabular-nums">
              {formatCentavos(totalCentavos)}
            </p>
          </div>
        </div>

        {/* Descuento global de la venta (oculto tras un link para no meter ruido) */}
        <div className="mb-5">
          {!mostrarDescuento && descuento_centavos === 0 ? (
            <button
              onClick={() => setMostrarDescuento(true)}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium cursor-pointer"
            >
              + Descuento a toda la venta
            </button>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 text-sm font-medium">Descuento (toda la venta)</label>
                <button
                  onClick={() => { setDescuento(0); setMostrarDescuento(false) }}
                  className="text-slate-500 hover:text-slate-300 text-xs cursor-pointer"
                >
                  Quitar
                </button>
              </div>
              <MoneyInput
                centavos={descuento_centavos}
                onChange={setDescuento}
                autoFocus
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white text-right
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </>
          )}
        </div>

        {/* Medio de pago */}
        <p className="text-slate-300 text-sm font-medium mb-3">Medio de pago</p>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {MEDIOS.map(m => (
            <button
              key={m.id}
              onClick={() => { setMedio(m.id); setRecibido(0) }}
              className={`py-3 px-4 rounded-xl border font-medium text-sm
                          flex items-center gap-2 cursor-pointer transition-all
                          ${medio === m.id
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-500'
                          }`}
            >
              <m.Icon size={16} />
              {m.label}
            </button>
          ))}
        </div>

        {/* Efectivo: monto recibido + vuelto */}
        {medio === 'efectivo' && (
          <div className="space-y-3 mb-5">
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1">
                Monto recibido
              </label>
              <MoneyInput
                centavos={recibido}
                onChange={setRecibido}
                autoFocus
                className="w-full bg-slate-800 border border-slate-600 rounded-xl
                           px-4 py-3 text-white text-xl text-right
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {recibido >= totalCentavos && (
              <div className="bg-emerald-900/30 border border-emerald-700 rounded-xl p-3 text-center">
                <p className="text-emerald-400 text-sm">Vuelto</p>
                <p className="text-emerald-300 text-3xl font-bold">
                  {formatCentavos(vueltoCentavos)}
                </p>
              </div>
            )}

            {recibido > 0 && recibido < totalCentavos && (
              <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 text-center">
                <p className="text-red-400 text-sm">Falta</p>
                <p className="text-red-300 text-2xl font-bold">
                  {formatCentavos(totalCentavos - recibido)}
                </p>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="py-3 rounded-xl border border-slate-600 text-slate-300
                       hover:bg-slate-800 font-medium cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={!puedeConfirmar || procesando}
            className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500
                       disabled:opacity-40 text-white font-bold
                       cursor-pointer transition-colors"
          >
            {procesando ? 'Procesando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}
