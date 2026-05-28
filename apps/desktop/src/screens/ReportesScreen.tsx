import { useEffect, useState } from 'react'
import type { Venta } from '@kioscapp/shared'
import { getDataStore } from '../store/dataStore'
import { formatCentavos } from '../lib/money'

const MEDIO_LABEL: Record<string, string> = {
  efectivo:        'Efectivo',
  debito:          'Débito',
  credito:         'Crédito',
  qr_mercado_pago: 'QR / MP',
  cuenta_corriente: 'Cta. cte.',
}

function fechaLocal(iso: string): string {
  return iso.slice(0, 10)
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export default function ReportesScreen() {
  const [ventasHoy, setVentasHoy] = useState<Venta[]>([])
  const [ventasSemana, setVentasSemana] = useState<Venta[]>([])

  const hoy = fechaLocal(new Date().toISOString())

  useEffect(() => {
    const store = getDataStore()
    store.getVentasDia(new Date().toISOString()).then(setVentasHoy)
    const hace7 = addDays(hoy, -6) + 'T00:00:00.000Z'
    const manana = addDays(hoy, 1) + 'T00:00:00.000Z'
    store.getVentasRango(hace7, manana).then(setVentasSemana)
  }, [hoy])

  // ── Resumen de hoy ────────────────────────────────────────────────────────
  const ventasActivasHoy = ventasHoy.filter(v => !v.anulada)
  const totalHoy = ventasActivasHoy.reduce((s, v) => s + v.total_centavos, 0)
  const porMedioHoy = ventasActivasHoy.reduce((acc, v) => {
    acc[v.medio_pago] = (acc[v.medio_pago] ?? 0) + v.total_centavos
    return acc
  }, {} as Record<string, number>)

  // ── Resumen semanal ───────────────────────────────────────────────────────
  const porDia = ventasSemana.reduce((acc, v) => {
    const d = fechaLocal(v.created_at)
    if (!acc[d]) acc[d] = { total: 0, cantidad: 0 }
    acc[d].total += v.total_centavos
    acc[d].cantidad += 1
    return acc
  }, {} as Record<string, { total: number; cantidad: number }>)

  const dias: string[] = []
  for (let i = 6; i >= 0; i--) dias.push(addDays(hoy, -i))

  const maxDia = Math.max(1, ...Object.values(porDia).map(d => d.total))

  return (
    <div className="flex flex-col h-full bg-slate-950 overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full p-6 space-y-8">

        {/* Hoy */}
        <section>
          <h2 className="text-white font-semibold text-lg mb-4">
            Hoy — {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
              <p className="text-slate-400 text-xs mb-1">Total vendido</p>
              <p className="text-blue-400 text-3xl font-bold">{formatCentavos(totalHoy)}</p>
            </div>
            <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
              <p className="text-slate-400 text-xs mb-1">Transacciones</p>
              <p className="text-white text-3xl font-bold">{ventasActivasHoy.length}</p>
            </div>
          </div>

          {Object.keys(porMedioHoy).length > 0 && (
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left px-4 py-2 text-slate-400 text-xs uppercase tracking-wide">Medio de pago</th>
                    <th className="text-right px-4 py-2 text-slate-400 text-xs uppercase tracking-wide">Total</th>
                    <th className="text-right px-4 py-2 text-slate-400 text-xs uppercase tracking-wide">Ventas</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(porMedioHoy)
                    .sort(([, a], [, b]) => b - a)
                    .map(([medio, total]) => (
                      <tr key={medio} className="border-b border-slate-800/50">
                        <td className="px-4 py-2.5 text-white">{MEDIO_LABEL[medio] ?? medio}</td>
                        <td className="px-4 py-2.5 text-right text-blue-400 font-mono">{formatCentavos(total)}</td>
                        <td className="px-4 py-2.5 text-right text-slate-400">
                          {ventasActivasHoy.filter(v => v.medio_pago === medio).length}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {ventasActivasHoy.length === 0 && (
            <div className="bg-slate-900 rounded-xl p-8 border border-slate-800 text-center text-slate-500">
              Sin ventas registradas hoy
            </div>
          )}
        </section>

        {/* Últimos 7 días */}
        <section>
          <h2 className="text-white font-semibold text-lg mb-4">Últimos 7 días</h2>

          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            {/* Gráfico de barras CSS */}
            <div className="flex items-end gap-2 px-4 pt-4 pb-2 h-32">
              {dias.map(dia => {
                const d = porDia[dia]
                const pct = d ? Math.round((d.total / maxDia) * 100) : 0
                const esHoy = dia === hoy
                return (
                  <div key={dia} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end" style={{ height: '72px' }}>
                      <div
                        className={`w-full rounded-t transition-all ${esHoy ? 'bg-blue-500' : 'bg-slate-600'}`}
                        style={{ height: `${Math.max(pct, d ? 4 : 0)}%` }}
                        title={d ? formatCentavos(d.total) : '$0'}
                      />
                    </div>
                    <span className={`text-[10px] ${esHoy ? 'text-blue-400' : 'text-slate-500'}`}>
                      {new Date(dia + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short' })}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Tabla */}
            <table className="w-full text-sm border-t border-slate-800">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-4 py-2 text-slate-400 text-xs uppercase tracking-wide">Fecha</th>
                  <th className="text-right px-4 py-2 text-slate-400 text-xs uppercase tracking-wide">Total</th>
                  <th className="text-right px-4 py-2 text-slate-400 text-xs uppercase tracking-wide">Ventas</th>
                </tr>
              </thead>
              <tbody>
                {[...dias].reverse().map(dia => {
                  const d = porDia[dia]
                  const esHoy = dia === hoy
                  return (
                    <tr key={dia} className={`border-b border-slate-800/50 ${esHoy ? 'bg-blue-900/10' : ''}`}>
                      <td className={`px-4 py-2.5 ${esHoy ? 'text-blue-300 font-medium' : 'text-white'}`}>
                        {new Date(dia + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })}
                        {esHoy && <span className="ml-2 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded">hoy</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right text-blue-400 font-mono">
                        {d ? formatCentavos(d.total) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-400">
                        {d ? d.cantidad : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  )
}
