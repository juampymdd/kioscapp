import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useCajaStore } from '../store/cajaStore'
import { getDataStore } from '../store/dataStore'
import { formatCentavos, parseCentavos } from '../lib/money'
import type { MovimientoCaja, Venta } from '@kioscapp/shared'

interface Props {
  onCancelar: () => void
}

export default function CerrarCaja({ onCancelar }: Props) {
  const { cajaActiva, setCajaActiva } = useCajaStore()
  const [montoStr, setMontoStr] = useState('')
  const [_movimientos, setMovimientos] = useState<MovimientoCaja[]>([])
  const [ventas, setVentas] = useState<Venta[]>([])
  const [cerrando, setCerrando] = useState(false)

  useEffect(() => {
    if (!cajaActiva) return
    const store = getDataStore()
    store.getMovimientosCaja(cajaActiva.id).then(setMovimientos)
    store.getVentasDia(new Date().toISOString()).then(setVentas)
  }, [cajaActiva])

  if (!cajaActiva) return null

  const totalVentas = ventas
    .filter(v => !v.anulada)
    .reduce((acc, v) => acc + v.total_centavos, 0)

  const ventasPorMedio = ventas.filter(v => !v.anulada).reduce(
    (acc, v) => {
      acc[v.medio_pago] = (acc[v.medio_pago] ?? 0) + v.total_centavos
      return acc
    },
    {} as Record<string, number>,
  )

  async function cerrar() {
    if (!cajaActiva) return
    const monto = parseCentavos(montoStr)
    setCerrando(true)
    try {
      const store = getDataStore()
      const ts = new Date().toISOString()
      const localId = import.meta.env.VITE_LOCAL_ID ?? 'local-demo'
      await store.cerrarCaja(cajaActiva.id, monto)
      await store.registrarMovimientoCaja({
        id: crypto.randomUUID(),
        caja_id: cajaActiva.id,
        tipo: 'cierre',
        monto_centavos: monto,
        descripcion: 'Cierre de caja',
        created_at: ts,
        updated_at: ts,
        local_id: localId,
        deleted_at: null,
      })
      setCajaActiva(null)
    } finally {
      setCerrando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-lg border border-slate-700 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Cierre de caja</h2>
          <button onClick={onCancelar} className="text-slate-400 hover:text-white cursor-pointer"><X size={20} /></button>
        </div>

        {/* Resumen del día */}
        <div className="space-y-3 mb-6">
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-sm mb-1">Apertura de caja</p>
            <p className="text-white font-bold text-lg">
              {formatCentavos(cajaActiva.monto_apertura_centavos)}
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-sm mb-2">Ventas del día</p>
            <p className="text-emerald-400 font-bold text-2xl mb-3">{formatCentavos(totalVentas)}</p>
            <div className="space-y-1">
              {Object.entries(ventasPorMedio).map(([medio, monto]) => (
                <div key={medio} className="flex justify-between text-sm">
                  <span className="text-slate-400 capitalize">{medio.replace('_', ' ')}</span>
                  <span className="text-white">{formatCentavos(monto)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-sm mb-1">Transacciones</p>
            <p className="text-white font-bold">{ventas.filter(v => !v.anulada).length} ventas</p>
          </div>
        </div>

        {/* Conteo físico */}
        <label className="block text-slate-300 text-sm font-medium mb-2">
          Efectivo contado en caja
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={montoStr}
          onChange={e => setMontoStr(e.target.value)}
          placeholder="0,00"
          className="w-full bg-slate-800 border border-slate-600 rounded-xl
                     px-4 py-3 text-white text-xl text-right mb-6
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onCancelar}
            className="py-3 rounded-xl border border-slate-600 text-slate-300
                       hover:bg-slate-800 font-medium cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={cerrar}
            disabled={cerrando}
            className="py-3 rounded-xl bg-red-700 hover:bg-red-600 disabled:opacity-40
                       text-white font-bold cursor-pointer transition-colors"
          >
            {cerrando ? 'Cerrando…' : 'Cerrar caja'}
          </button>
        </div>
      </div>
    </div>
  )
}
