'use client'
import { useEffect, useState } from 'react'
import { ShoppingBag } from 'lucide-react'
import PageHeader from '../_components/PageHeader'
import Skeleton from '../_components/Skeleton'
import { useConfirm } from '../_components/confirm'

type Compra = {
  id: string; fecha: string; total_centavos: number; notas: string | null
  sucursal_nombre: string | null; proveedor_nombre: string | null
}
type Sucursal = { id: string; nombre: string }
type Proveedor = { id: string; nombre: string }

const pesos = (c: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format((c ?? 0) / 100)

export default function ComprasPage() {
  const confirm = useConfirm()
  const [items, setItems] = useState<Compra[]>([])
  const [sucs, setSucs] = useState<Sucursal[]>([])
  const [provs, setProvs] = useState<Proveedor[]>([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState<{ sucursal_id: string; proveedor_id: string; fecha: string; totalStr: string; notas: string } | null>(null)

  async function cargar() {
    try { const r = await fetch('/api/compras'); setItems(await r.json()) } finally { setCargando(false) }
  }
  useEffect(() => {
    cargar()
    fetch('/api/sucursales').then(r => r.json()).then(setSucs)
    fetch('/api/proveedores').then(r => r.json()).then(setProvs)
  }, [])

  function nueva() {
    setForm({ sucursal_id: '', proveedor_id: '', fecha: new Date().toISOString().slice(0, 10), totalStr: '', notas: '' })
  }
  async function guardar() {
    if (!form) return
    const total = Math.round(Number(form.totalStr.replace(',', '.') || '0') * 100)
    if (total <= 0) return
    await fetch('/api/compras', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sucursal_id: form.sucursal_id || null, proveedor_id: form.proveedor_id || null, fecha: form.fecha, total_centavos: total, notas: form.notas || null }) })
    setForm(null); await cargar()
  }
  async function borrar(c: Compra) {
    const ok = await confirm({
      titulo: '¿Eliminar esta compra?',
      mensaje: `${c.fecha} · ${c.proveedor_nombre ?? 'sin proveedor'} · ${pesos(c.total_centavos)}. No se puede deshacer.`,
    })
    if (!ok) return
    await fetch(`/api/compras/${c.id}`, { method: 'DELETE' }); await cargar()
  }

  const totalMes = items.reduce((s, c) => s + c.total_centavos, 0)
  const inputCls = 'mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-50 text-sm'

  return (
    <div className="text-slate-50">
      <PageHeader Icon={ShoppingBag} title="Compras" subtitle="Registro de compras a proveedores"
        actions={<button onClick={nueva} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors">+ Registrar compra</button>}
      />

      <p className="text-sm text-slate-400 mb-4">Total registrado: <span className="text-blue-400 font-bold">{pesos(totalMes)}</span> · {items.length} compras</p>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-slate-500 text-xs uppercase tracking-wide border-b border-slate-800 text-left">
            <tr><th className="px-4 py-2.5">Fecha</th><th>Sucursal</th><th>Proveedor</th><th>Notas</th><th className="text-right">Total</th><th></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {cargando && Array.from({ length: 5 }).map((_, i) => (<tr key={i}><td className="px-4 py-3" colSpan={6}><Skeleton className="h-4 w-full" /></td></tr>))}
            {!cargando && items.map(c => (
              <tr key={c.id}>
                <td className="px-4 py-2.5 whitespace-nowrap">{c.fecha}</td>
                <td className="text-slate-400">{c.sucursal_nombre ?? '—'}</td>
                <td className="text-slate-400">{c.proveedor_nombre ?? '—'}</td>
                <td className="text-slate-500">{c.notas ?? '—'}</td>
                <td className="text-right tabular-nums">{pesos(c.total_centavos)}</td>
                <td className="text-right"><button onClick={() => borrar(c)} className="text-red-400 hover:text-red-300 text-xs">Eliminar</button></td>
              </tr>
            ))}
            {!cargando && items.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Sin compras registradas</td></tr>}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setForm(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-800 font-bold text-lg">Registrar compra</div>
            <div className="p-5 grid grid-cols-2 gap-3">
              <label className="text-xs text-slate-400">Sucursal
                <select value={form.sucursal_id} onChange={e => setForm({ ...form, sucursal_id: e.target.value })} className={inputCls}>
                  <option value="">—</option>{sucs.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </label>
              <label className="text-xs text-slate-400">Proveedor
                <select value={form.proveedor_id} onChange={e => setForm({ ...form, proveedor_id: e.target.value })} className={inputCls}>
                  <option value="">—</option>{provs.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </label>
              <label className="text-xs text-slate-400">Fecha
                <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} className={inputCls} />
              </label>
              <label className="text-xs text-slate-400">Total ($)
                <input value={form.totalStr} onChange={e => setForm({ ...form, totalStr: e.target.value })} inputMode="decimal" className={inputCls} />
              </label>
              <label className="text-xs text-slate-400 col-span-2">Notas
                <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={2} className={inputCls + ' resize-none'} />
              </label>
            </div>
            <div className="px-5 py-4 border-t border-slate-800 flex gap-2">
              <button onClick={guardar} className="flex-1 bg-blue-600 hover:bg-blue-500 rounded-xl py-2.5 font-medium">Guardar</button>
              <button onClick={() => setForm(null)} className="px-4 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
