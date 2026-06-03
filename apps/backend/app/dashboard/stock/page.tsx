'use client'
import { useEffect, useState } from 'react'
import { Boxes, AlertTriangle } from 'lucide-react'
import PageHeader from '../_components/PageHeader'
import Skeleton from '../_components/Skeleton'

type Fila = {
  id: string; cantidad: number; alerta_minimo: number; producto: string
  sucursal: string; caja: string; bajo: boolean; activo: boolean
}
type Sucursal = { id: string; nombre: string }

export default function StockPage() {
  const [items, setItems] = useState<Fila[]>([])
  const [sucs, setSucs] = useState<Sucursal[]>([])
  const [cargando, setCargando] = useState(true)
  const [sucursal, setSucursal] = useState('')
  const [soloBajo, setSoloBajo] = useState(false)

  async function cargar() {
    setCargando(true)
    try {
      const qs = sucursal ? `?sucursal=${sucursal}` : ''
      const r = await fetch(`/api/stock${qs}`); setItems(await r.json())
    } finally { setCargando(false) }
  }
  useEffect(() => { fetch('/api/sucursales').then(r => r.json()).then(setSucs) }, [])
  useEffect(() => { cargar() }, [sucursal])

  const bajos = items.filter(i => i.bajo).length
  const visibles = soloBajo ? items.filter(i => i.bajo) : items

  return (
    <div className="text-slate-50">
      <PageHeader Icon={Boxes} title="Stock" subtitle="Inventario por sucursal (lo reporta cada caja)" />

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <select value={sucursal} onChange={e => setSucursal(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-50 text-sm">
          <option value="">Todas las sucursales</option>
          {sucs.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <button onClick={() => setSoloBajo(b => !b)}
          className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg ${soloBajo ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
          <AlertTriangle size={14} /> Stock bajo {bajos > 0 && `(${bajos})`}
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-slate-500 text-xs uppercase tracking-wide border-b border-slate-800 text-left">
            <tr><th className="px-4 py-2.5">Producto</th><th>Sucursal · Caja</th><th className="text-right">Cantidad</th><th className="text-right">Alerta</th><th></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {cargando && Array.from({ length: 8 }).map((_, i) => (
              <tr key={i}><td className="px-4 py-3" colSpan={5}><Skeleton className="h-4 w-full" /></td></tr>
            ))}
            {!cargando && visibles.map(f => (
              <tr key={f.id} className={`${f.bajo ? 'bg-amber-950/20' : ''} ${f.activo ? '' : 'opacity-50'}`}>
                <td className="px-4 py-2.5 font-medium">{f.producto}</td>
                <td className="text-slate-400">{f.sucursal} · {f.caja}</td>
                <td className="text-right tabular-nums">{f.cantidad}</td>
                <td className="text-right text-slate-500 tabular-nums">{f.alerta_minimo}</td>
                <td>{f.bajo
                  ? <span className="inline-flex items-center gap-1 text-xs text-amber-300"><AlertTriangle size={12} /> Bajo</span>
                  : <span className="text-xs text-emerald-400">OK</span>}</td>
              </tr>
            ))}
            {!cargando && visibles.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">{soloBajo ? 'Nada con stock bajo' : 'Sin datos de stock todavía'}</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-slate-600 text-xs mt-3">El stock lo lleva cada caja (lo descuenta al vender y lo ajusta en la app de escritorio). Acá lo ves consolidado por sucursal.</p>
    </div>
  )
}
