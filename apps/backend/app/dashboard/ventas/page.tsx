'use client'
import { useEffect, useState } from 'react'
import { Receipt, ChevronRight, ChevronDown } from 'lucide-react'
import PageHeader from '../_components/PageHeader'
import Skeleton from '../_components/Skeleton'

type Venta = {
  id: string; created_at: string; medio_pago: string; total_centavos: number
  descuento_centavos: number; anulada: boolean; sucursal_nombre: string; caja_nombre: string
}
type Item = {
  id: string; descripcion: string; cantidad: number; precio_unit_centavos: number
  subtotal_centavos: number; descuento_centavos: number; descuento_origen: string | null; descuento_detalle: string | null
}
type Sucursal = { id: string; nombre: string }

const pesos = (c: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format((c ?? 0) / 100)
const MEDIO: Record<string, string> = { efectivo: 'Efectivo', debito: 'Débito', credito: 'Crédito', qr_mercado_pago: 'QR / MP', cuenta_corriente: 'Cta. cte.' }
const fechaHora = (iso: string) => new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

function rango(p: string): { desde?: string } {
  const d = new Date(); d.setHours(0, 0, 0, 0)
  if (p === 'hoy') return { desde: d.toISOString() }
  if (p === '7') { d.setDate(d.getDate() - 6); return { desde: d.toISOString() } }
  if (p === '30') { d.setDate(d.getDate() - 29); return { desde: d.toISOString() } }
  return {}
}

export default function VentasAdminPage() {
  const [items, setItems] = useState<Venta[]>([])
  const [sucs, setSucs] = useState<Sucursal[]>([])
  const [cargando, setCargando] = useState(true)
  const [periodo, setPeriodo] = useState('hoy')
  const [sucursal, setSucursal] = useState('')
  const [medio, setMedio] = useState('')
  const [exp, setExp] = useState<string | null>(null)
  const [itemsMap, setItemsMap] = useState<Record<string, Item[]>>({})

  async function cargar() {
    setCargando(true)
    try {
      const { desde } = rango(periodo)
      const qs = new URLSearchParams()
      if (sucursal) qs.set('sucursal', sucursal)
      if (medio) qs.set('medio', medio)
      if (desde) qs.set('desde', desde)
      const r = await fetch(`/api/ventas?${qs}`); setItems(await r.json()); setExp(null)
    } finally { setCargando(false) }
  }
  useEffect(() => { fetch('/api/sucursales').then(r => r.json()).then(setSucs) }, [])
  useEffect(() => { cargar() }, [periodo, sucursal, medio])

  async function toggle(id: string) {
    if (exp === id) { setExp(null); return }
    setExp(id)
    if (!itemsMap[id]) {
      const r = await fetch(`/api/ventas/${id}/items`); const data = await r.json(); setItemsMap(m => ({ ...m, [id]: data }))
    }
  }

  const total = items.filter(v => !v.anulada).reduce((s, v) => s + v.total_centavos, 0)
  const inputCls = 'bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-50 text-sm'

  return (
    <div className="text-slate-50">
      <PageHeader Icon={Receipt} title="Ventas" subtitle="Historial de todas las sucursales" />

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        {(['hoy', '7', '30'] as const).map(p => (
          <button key={p} onClick={() => setPeriodo(p)}
            className={`text-sm px-3 py-1.5 rounded-lg ${periodo === p ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
            {{ hoy: 'Hoy', '7': '7 días', '30': '30 días' }[p]}
          </button>
        ))}
        <select value={sucursal} onChange={e => setSucursal(e.target.value)} className={inputCls}>
          <option value="">Todas las sucursales</option>
          {sucs.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <select value={medio} onChange={e => setMedio(e.target.value)} className={inputCls}>
          <option value="">Todos los medios</option>
          {Object.entries(MEDIO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <span className="ml-auto text-sm text-slate-400">Total: <span className="text-blue-400 font-bold">{pesos(total)}</span> · {items.length} ventas</span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-slate-500 text-xs uppercase tracking-wide border-b border-slate-800 text-left">
            <tr><th className="px-4 py-2.5 w-8"></th><th>Fecha</th><th>Sucursal</th><th>Caja</th><th>Medio</th><th className="text-right">Total</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {cargando && Array.from({ length: 8 }).map((_, i) => (
              <tr key={i}><td className="px-4 py-3" colSpan={6}><Skeleton className="h-4 w-full" /></td></tr>
            ))}
            {!cargando && items.map(v => (
              <>
                <tr key={v.id} onClick={() => toggle(v.id)} className={`cursor-pointer hover:bg-slate-800/50 ${v.anulada ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-2.5 text-slate-600">{exp === v.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                  <td className="whitespace-nowrap">{fechaHora(v.created_at)}{v.anulada && <span className="ml-2 text-[10px] bg-red-500/15 text-red-300 px-1.5 py-0.5 rounded">Anulada</span>}</td>
                  <td className="text-slate-300">{v.sucursal_nombre}</td>
                  <td className="text-slate-400">{v.caja_nombre}</td>
                  <td className="text-slate-400">{MEDIO[v.medio_pago] ?? v.medio_pago}</td>
                  <td className="text-right font-medium tabular-nums">{pesos(v.total_centavos)}</td>
                </tr>
                {exp === v.id && (
                  <tr key={v.id + '-x'} className="bg-slate-800/30">
                    <td></td>
                    <td colSpan={5} className="px-4 py-3">
                      {!itemsMap[v.id] ? <Skeleton className="h-4 w-40" /> : (
                        <table className="w-full text-xs">
                          <tbody className="divide-y divide-slate-700/40">
                            {itemsMap[v.id].map(it => (
                              <tr key={it.id}>
                                <td className="py-1 text-slate-300">
                                  {it.descripcion}
                                  {it.descuento_centavos > 0 && <span className="ml-2 text-amber-400">{it.descuento_origen === 'promo' ? 'Promo' : 'Desc.'}{it.descuento_detalle ? ` ${it.descuento_detalle}` : ''} − {pesos(it.descuento_centavos)}</span>}
                                </td>
                                <td className="py-1 text-right text-slate-400">{it.cantidad}</td>
                                <td className="py-1 text-right text-slate-400 tabular-nums">{pesos(it.precio_unit_centavos)}</td>
                                <td className="py-1 text-right text-white tabular-nums">{pesos(it.subtotal_centavos)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
            {!cargando && items.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Sin ventas en el período</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
