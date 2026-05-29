import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-react'
import type { Venta, VentaItem } from '@kioscapp/shared'
import { getDataStore } from '../store/dataStore'
import { formatCentavos } from '../lib/money'

const PAGE_SIZE = 20

const MEDIO_LABEL: Record<string, string> = {
  efectivo:          'Efectivo',
  debito:            'Débito',
  credito:           'Crédito',
  qr_mercado_pago:   'QR / MP',
  cuenta_corriente:  'Cta. cte.',
}

const MEDIO_COLOR: Record<string, string> = {
  efectivo:          'bg-emerald-900/40 text-emerald-400',
  debito:            'bg-blue-900/40 text-blue-400',
  credito:           'bg-purple-900/40 text-purple-400',
  qr_mercado_pago:   'bg-sky-900/40 text-sky-400',
  cuenta_corriente:  'bg-amber-900/40 text-amber-400',
}

type Periodo = 'hoy' | 'ayer' | '7dias' | 'mes' | 'custom'

function addDays(base: Date, days: number) {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

function rangoParaPeriodo(p: Periodo, desde: string, hasta: string): [string, string] {
  const hoy  = new Date(); hoy.setHours(0, 0, 0, 0)
  const ayer = addDays(hoy, -1)

  switch (p) {
    case 'hoy':   return [hoy.toISOString(),  addDays(hoy,  1).toISOString()]
    case 'ayer':  return [ayer.toISOString(), hoy.toISOString()]
    case '7dias': return [addDays(hoy, -6).toISOString(), addDays(hoy, 1).toISOString()]
    case 'mes':   return [addDays(hoy, -29).toISOString(), addDays(hoy, 1).toISOString()]
    case 'custom': {
      const d = desde ? new Date(desde + 'T00:00:00') : ayer
      const h = hasta ? new Date(hasta + 'T23:59:59') : hoy
      return [d.toISOString(), addDays(h, 1).toISOString()]
    }
  }
}

function formatFechaHora(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function VentasScreen() {
  const [ventas,      setVentas]      = useState<Venta[]>([])
  const [periodo,     setPeriodo]     = useState<Periodo>('hoy')
  const [medioFiltro, setMedioFiltro] = useState('todos')
  const [customDesde, setCustomDesde] = useState('')
  const [customHasta, setCustomHasta] = useState('')
  const [page,        setPage]        = useState(1)
  const [expandedId,  setExpandedId]  = useState<string | null>(null)
  const [itemsMap,    setItemsMap]    = useState<Record<string, VentaItem[]>>({})
  const [loading,     setLoading]     = useState(false)

  async function cargar() {
    setLoading(true)
    try {
      const [desde, hasta] = rangoParaPeriodo(periodo, customDesde, customHasta)
      const rows = await getDataStore().getVentasRango(desde, hasta)
      setVentas(rows)
      setPage(1)
      setExpandedId(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [periodo, customDesde, customHasta])

  const filtradas = useMemo(
    () => medioFiltro === 'todos' ? ventas : ventas.filter(v => v.medio_pago === medioFiltro),
    [ventas, medioFiltro],
  )

  const totalPaginas  = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE))
  const paginaActual  = Math.min(page, totalPaginas)
  const ventasPagina  = filtradas.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE)

  const totalFiltrado  = filtradas.filter(v => !v.anulada).reduce((s, v) => s + v.total_centavos, 0)
  const cantidadActiva = filtradas.filter(v => !v.anulada).length

  async function toggleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (!itemsMap[id]) {
      const its = await getDataStore().getVentaItemsPorVenta(id)
      setItemsMap(prev => ({ ...prev, [id]: its }))
    }
  }

  const mediosDisponibles = [...new Set(ventas.map(v => v.medio_pago))]

  return (
    <div className="flex flex-col h-full bg-slate-950 overflow-hidden">

      {/* Barra de filtros */}
      <div className="shrink-0 bg-slate-900 border-b border-slate-800 px-5 py-3 flex flex-wrap gap-3 items-end">
        {/* Período */}
        <div>
          <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">Período</p>
          <div className="flex gap-1">
            {(['hoy', 'ayer', '7dias', 'mes', 'custom'] as Periodo[]).map(p => (
              <button key={p}
                onClick={() => { setPeriodo(p); setPage(1) }}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer
                  ${periodo === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
                {{ hoy: 'Hoy', ayer: 'Ayer', '7dias': '7 días', mes: '30 días', custom: 'Custom' }[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Custom dates */}
        {periodo === 'custom' && (
          <div className="flex gap-2 items-center">
            <input type="date" value={customDesde} onChange={e => setCustomDesde(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
            <span className="text-slate-500 text-xs">→</span>
            <input type="date" value={customHasta} onChange={e => setCustomHasta(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        )}

        {/* Medio de pago */}
        <div>
          <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">Medio de pago</p>
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => { setMedioFiltro('todos'); setPage(1) }}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer
                ${medioFiltro === 'todos' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
              Todos
            </button>
            {mediosDisponibles.map(m => (
              <button key={m} onClick={() => { setMedioFiltro(m); setPage(1) }}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer
                  ${medioFiltro === m ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
                {MEDIO_LABEL[m] ?? m}
              </button>
            ))}
          </div>
        </div>

        <button onClick={cargar} disabled={loading}
          className="ml-auto text-slate-500 hover:text-white transition-colors cursor-pointer"
          title="Actualizar">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Resumen */}
      <div className="shrink-0 px-5 py-3 flex gap-6 border-b border-slate-800">
        <div>
          <p className="text-slate-500 text-xs mb-0.5">Total</p>
          <p className="text-blue-400 font-bold text-xl font-mono">{formatCentavos(totalFiltrado)}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs mb-0.5">Transacciones</p>
          <p className="text-white font-bold text-xl">{cantidadActiva}</p>
        </div>
        {filtradas.length !== cantidadActiva && (
          <div>
            <p className="text-slate-500 text-xs mb-0.5">Anuladas</p>
            <p className="text-red-400 font-bold text-xl">{filtradas.length - cantidadActiva}</p>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-y-auto">
        {filtradas.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-slate-600">
            {loading ? 'Cargando…' : 'Sin ventas en el período seleccionado'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900 z-10">
              <tr className="border-b border-slate-800 text-left">
                <th className="px-4 py-2.5 text-slate-500 text-xs font-medium uppercase tracking-wide w-8"></th>
                <th className="px-4 py-2.5 text-slate-500 text-xs font-medium uppercase tracking-wide">Fecha / Hora</th>
                <th className="px-4 py-2.5 text-slate-500 text-xs font-medium uppercase tracking-wide">Medio</th>
                <th className="px-4 py-2.5 text-slate-500 text-xs font-medium uppercase tracking-wide text-right">Ítems</th>
                <th className="px-4 py-2.5 text-slate-500 text-xs font-medium uppercase tracking-wide text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {ventasPagina.map(v => (
                <>
                  <tr
                    key={v.id}
                    onClick={() => toggleExpand(v.id)}
                    className={`cursor-pointer transition-colors
                      ${v.anulada ? 'opacity-50' : ''}
                      ${expandedId === v.id ? 'bg-slate-800/60' : 'hover:bg-slate-900/60'}`}
                  >
                    <td className="px-4 py-3 text-slate-600">
                      {expandedId === v.id
                        ? <ChevronDown size={14} />
                        : <ChevronRight size={14} />}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white">{formatFechaHora(v.created_at)}</span>
                      {v.anulada && <span className="ml-2 text-[10px] bg-red-900/50 text-red-400 px-1.5 py-0.5 rounded">ANULADA</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MEDIO_COLOR[v.medio_pago] ?? 'bg-slate-700 text-slate-300'}`}>
                        {MEDIO_LABEL[v.medio_pago] ?? v.medio_pago}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400 text-xs">
                      {itemsMap[v.id]?.length ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-white">
                      {formatCentavos(v.total_centavos)}
                    </td>
                  </tr>

                  {expandedId === v.id && (
                    <tr key={`${v.id}-items`} className="bg-slate-800/40">
                      <td></td>
                      <td colSpan={4} className="px-6 py-3">
                        {!itemsMap[v.id] ? (
                          <p className="text-slate-500 text-xs">Cargando ítems…</p>
                        ) : itemsMap[v.id].length === 0 ? (
                          <p className="text-slate-500 text-xs">Sin ítems registrados</p>
                        ) : (
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-slate-500 border-b border-slate-700">
                                <th className="text-left pb-1.5">Producto</th>
                                <th className="text-right pb-1.5">Cant.</th>
                                <th className="text-right pb-1.5">P. Unit.</th>
                                <th className="text-right pb-1.5">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/40">
                              {itemsMap[v.id].map(it => (
                                <tr key={it.id}>
                                  <td className="py-1.5 text-slate-300">{it.descripcion}</td>
                                  <td className="py-1.5 text-right text-slate-400">{it.cantidad}</td>
                                  <td className="py-1.5 text-right text-slate-400 font-mono">{formatCentavos(it.precio_unit_centavos)}</td>
                                  <td className="py-1.5 text-right text-white font-mono">{formatCentavos(it.subtotal_centavos)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                        {v.vuelto_centavos > 0 && (
                          <p className="text-slate-500 text-xs mt-2">
                            Recibido: {formatCentavos(v.monto_recibido_centavos)} · Vuelto: {formatCentavos(v.vuelto_centavos)}
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="shrink-0 border-t border-slate-800 px-5 py-3 flex items-center justify-between">
          <p className="text-slate-500 text-xs">
            {filtradas.length} resultados · Página {paginaActual} de {totalPaginas}
          </p>
          <div className="flex gap-1">
            <button onClick={() => setPage(1)} disabled={paginaActual === 1}
              className="px-2 py-1 text-xs bg-slate-800 text-slate-400 rounded disabled:opacity-30 hover:bg-slate-700 cursor-pointer transition-colors">«</button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={paginaActual === 1}
              className="px-3 py-1 text-xs bg-slate-800 text-slate-400 rounded disabled:opacity-30 hover:bg-slate-700 cursor-pointer transition-colors">‹</button>
            {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
              const start = Math.max(1, Math.min(paginaActual - 2, totalPaginas - 4))
              const p = start + i
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-3 py-1 text-xs rounded transition-colors cursor-pointer
                    ${p === paginaActual ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                  {p}
                </button>
              )
            })}
            <button onClick={() => setPage(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}
              className="px-3 py-1 text-xs bg-slate-800 text-slate-400 rounded disabled:opacity-30 hover:bg-slate-700 cursor-pointer transition-colors">›</button>
            <button onClick={() => setPage(totalPaginas)} disabled={paginaActual === totalPaginas}
              className="px-2 py-1 text-xs bg-slate-800 text-slate-400 rounded disabled:opacity-30 hover:bg-slate-700 cursor-pointer transition-colors">»</button>
          </div>
        </div>
      )}
    </div>
  )
}
