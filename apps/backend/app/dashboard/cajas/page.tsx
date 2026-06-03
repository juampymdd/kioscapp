'use client'
import { useEffect, useState } from 'react'
import { Wallet, ChevronRight, ChevronDown } from 'lucide-react'
import PageHeader from '../_components/PageHeader'
import Skeleton from '../_components/Skeleton'

type Caja = {
  id: string; apertura_at: string; cierre_at: string | null; estado: string
  monto_apertura_centavos: number; monto_cierre_centavos: number | null
  sucursal_nombre: string; caja_nombre: string
  total_ventas_centavos: number; total_efectivo_centavos: number; cantidad_ventas: number
  esperado_efectivo_centavos: number; diferencia_centavos: number | null
}
type Mov = { id: string; tipo: string; monto_centavos: number; descripcion: string; created_at: string }
type Sucursal = { id: string; nombre: string }

const pesos = (c: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format((c ?? 0) / 100)
const fechaHora = (iso: string) => new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export default function CajasPage() {
  const [items, setItems] = useState<Caja[]>([])
  const [sucs, setSucs] = useState<Sucursal[]>([])
  const [cargando, setCargando] = useState(true)
  const [sucursal, setSucursal] = useState('')
  const [exp, setExp] = useState<string | null>(null)
  const [movs, setMovs] = useState<Record<string, Mov[]>>({})

  async function cargar() {
    setCargando(true)
    try {
      const qs = sucursal ? `?sucursal=${sucursal}` : ''
      const r = await fetch(`/api/cajas${qs}`); setItems(await r.json()); setExp(null)
    } finally { setCargando(false) }
  }
  useEffect(() => { fetch('/api/sucursales').then(r => r.json()).then(setSucs) }, [])
  useEffect(() => { cargar() }, [sucursal])

  async function toggle(id: string) {
    if (exp === id) { setExp(null); return }
    setExp(id)
    if (!movs[id]) { const r = await fetch(`/api/cajas/${id}`); const data = await r.json(); setMovs(m => ({ ...m, [id]: data })) }
  }

  return (
    <div className="text-slate-50">
      <PageHeader Icon={Wallet} title="Cajas y arqueos" subtitle="Turnos, cierres y diferencias por sucursal" />

      <div className="flex gap-2 mb-4">
        <select value={sucursal} onChange={e => setSucursal(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-50 text-sm">
          <option value="">Todas las sucursales</option>
          {sucs.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-slate-500 text-xs uppercase tracking-wide border-b border-slate-800 text-left">
            <tr><th className="px-4 py-2.5 w-8"></th><th>Apertura</th><th>Sucursal · Caja</th><th>Estado</th><th className="text-right">Ventas</th><th className="text-right">Diferencia</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {cargando && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}><td className="px-4 py-3" colSpan={6}><Skeleton className="h-4 w-full" /></td></tr>
            ))}
            {!cargando && items.map(c => (
              <>
                <tr key={c.id} onClick={() => toggle(c.id)} className="cursor-pointer hover:bg-slate-800/50">
                  <td className="px-4 py-2.5 text-slate-600">{exp === c.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                  <td className="whitespace-nowrap">{fechaHora(c.apertura_at)}</td>
                  <td className="text-slate-300">{c.sucursal_nombre} · <span className="text-slate-400">{c.caja_nombre}</span></td>
                  <td><span className={`text-xs px-2 py-0.5 rounded-full ${c.estado === 'abierta' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>{c.estado}</span></td>
                  <td className="text-right tabular-nums">{pesos(c.total_ventas_centavos)}</td>
                  <td className="text-right tabular-nums">
                    {c.diferencia_centavos == null ? <span className="text-slate-600">—</span>
                      : c.diferencia_centavos === 0 ? <span className="text-emerald-400">OK</span>
                      : <span className={c.diferencia_centavos > 0 ? 'text-amber-400' : 'text-red-400'}>{c.diferencia_centavos > 0 ? '+' : ''}{pesos(c.diferencia_centavos)}</span>}
                  </td>
                </tr>
                {exp === c.id && (
                  <tr key={c.id + '-x'} className="bg-slate-800/30">
                    <td></td>
                    <td colSpan={5} className="px-4 py-3 space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div><p className="text-slate-500">Apertura</p><p className="tabular-nums">{pesos(c.monto_apertura_centavos)}</p></div>
                        <div><p className="text-slate-500">Efectivo vendido</p><p className="tabular-nums">{pesos(c.total_efectivo_centavos)}</p></div>
                        <div><p className="text-slate-500">Esperado en caja</p><p className="tabular-nums">{pesos(c.esperado_efectivo_centavos)}</p></div>
                        <div><p className="text-slate-500">Contado al cierre</p><p className="tabular-nums">{c.monto_cierre_centavos == null ? '—' : pesos(c.monto_cierre_centavos)}</p></div>
                      </div>
                      {!movs[c.id] ? <Skeleton className="h-4 w-40" /> : movs[c.id].length === 0 ? <p className="text-slate-500 text-xs">Sin movimientos</p> : (
                        <table className="w-full text-xs">
                          <tbody className="divide-y divide-slate-700/40">
                            {movs[c.id].map(m => (
                              <tr key={m.id}>
                                <td className="py-1 text-slate-400 whitespace-nowrap">{fechaHora(m.created_at)}</td>
                                <td className="py-1 text-slate-300">{m.descripcion}</td>
                                <td className={`py-1 text-right tabular-nums ${m.monto_centavos < 0 ? 'text-amber-400' : 'text-white'}`}>{pesos(m.monto_centavos)}</td>
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
            {!cargando && items.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Sin turnos</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
