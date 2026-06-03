'use client'
import { useEffect, useState } from 'react'
import { Package } from 'lucide-react'
import PageHeader from '../_components/PageHeader'
import Skeleton from '../_components/Skeleton'

type Producto = {
  id: string; descripcion: string; categoria: string; precio_centavos: number
  codigo_barras: string | null; fraccionable: boolean; precio_variable: boolean
  unidad_medida: string; activo: boolean; cantidad: number
}
type Categoria = { id: string; nombre: string }

const pesos = (c: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format((c ?? 0) / 100)

type Form = {
  id?: string; descripcion: string; categoria: string; precioStr: string
  codigo_barras: string; fraccionable: boolean; precio_variable: boolean; cantidad: number; activo: boolean
}

export default function ProductosPage() {
  const [items, setItems] = useState<Producto[]>([])
  const [cats, setCats] = useState<Categoria[]>([])
  const [cargando, setCargando] = useState(true)
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState<Form | null>(null)

  async function cargar() {
    try { const r = await fetch('/api/productos'); setItems(await r.json()) } finally { setCargando(false) }
  }
  useEffect(() => {
    cargar()
    fetch('/api/categorias').then(r => r.json()).then(setCats)
  }, [])

  function nuevo() {
    setEdit({ descripcion: '', categoria: cats[0]?.id ?? 'varios', precioStr: '', codigo_barras: '', fraccionable: false, precio_variable: false, cantidad: 0, activo: true })
  }
  function editar(p: Producto) {
    setEdit({ id: p.id, descripcion: p.descripcion, categoria: p.categoria, precioStr: (p.precio_centavos / 100).toFixed(2), codigo_barras: p.codigo_barras ?? '', fraccionable: p.fraccionable, precio_variable: p.precio_variable, cantidad: p.cantidad, activo: p.activo })
  }

  async function guardar() {
    if (!edit || !edit.descripcion.trim()) return
    const body = {
      descripcion: edit.descripcion, categoria: edit.categoria,
      precio_centavos: Math.round(Number(edit.precioStr.replace(',', '.') || '0') * 100),
      codigo_barras: edit.codigo_barras || null,
      fraccionable: edit.fraccionable, precio_variable: edit.precio_variable,
      cantidad: edit.cantidad, activo: edit.activo,
    }
    if (edit.id) await fetch(`/api/productos/${edit.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    else await fetch('/api/productos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setEdit(null); await cargar()
  }
  async function borrar(id: string) {
    await fetch(`/api/productos/${id}`, { method: 'DELETE' }); setEdit(null); await cargar()
  }

  const catNombre = (id: string) => cats.find(c => c.id === id)?.nombre ?? id
  const filtrados = items.filter(p => !q || p.descripcion.toLowerCase().includes(q.toLowerCase()) || (p.codigo_barras ?? '').includes(q))

  const inputCls = 'mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="text-slate-50">
      <PageHeader Icon={Package} title="Productos" subtitle="Catálogo sincronizado con todas las cajas"
        actions={
          <button onClick={nuevo} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors">
            + Nuevo producto
          </button>
        }
      />

      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre o código…"
        className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-50 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-slate-500 text-xs uppercase tracking-wide border-b border-slate-800 text-left">
            <tr>
              <th className="px-4 py-2.5">Descripción</th><th>Categoría</th>
              <th className="text-right">Precio</th><th className="text-right">Stock</th>
              <th>Código</th><th>Estado</th><th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {cargando && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}><td className="px-4 py-3" colSpan={7}><Skeleton className="h-4 w-full" /></td></tr>
            ))}
            {!cargando && filtrados.map(p => (
              <tr key={p.id} onClick={() => editar(p)} className={`cursor-pointer hover:bg-slate-800/50 ${p.activo ? '' : 'opacity-50'}`}>
                <td className="px-4 py-2.5 font-medium">{p.descripcion}</td>
                <td className="text-slate-400">{catNombre(p.categoria)}</td>
                <td className="text-right text-blue-400 tabular-nums">{p.precio_variable ? 'Variable' : pesos(p.precio_centavos)}</td>
                <td className="text-right text-slate-300 tabular-nums">{p.cantidad}</td>
                <td className="text-slate-500 text-xs">{p.codigo_barras ?? '—'}</td>
                <td><span className={`text-xs px-2 py-0.5 rounded-full ${p.activo ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>{p.activo ? 'Activo' : 'Inactivo'}</span></td>
                <td></td>
              </tr>
            ))}
            {!cargando && filtrados.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">Sin productos</td></tr>}
          </tbody>
        </table>
      </div>

      {edit && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setEdit(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-800 font-bold text-lg">{edit.id ? 'Editar producto' : 'Nuevo producto'}</div>
            <div className="flex-1 overflow-y-auto p-5 grid grid-cols-2 gap-3">
              <label className="text-xs text-slate-400 col-span-2">Descripción
                <input value={edit.descripcion} onChange={e => setEdit({ ...edit, descripcion: e.target.value })} autoFocus className={inputCls} />
              </label>
              <label className="text-xs text-slate-400">Categoría
                <select value={edit.categoria} onChange={e => setEdit({ ...edit, categoria: e.target.value })} className={inputCls}>
                  {cats.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </label>
              <label className="text-xs text-slate-400">Código de barras
                <input value={edit.codigo_barras} onChange={e => setEdit({ ...edit, codigo_barras: e.target.value })} className={inputCls} />
              </label>
              <label className="text-xs text-slate-400">Precio ($)
                <input value={edit.precioStr} onChange={e => setEdit({ ...edit, precioStr: e.target.value })} inputMode="decimal" className={inputCls} />
              </label>
              <label className="text-xs text-slate-400">Stock
                <input type="number" value={edit.cantidad} onChange={e => setEdit({ ...edit, cantidad: Number(e.target.value) })} className={inputCls} />
              </label>
              <label className="flex items-center gap-2 text-slate-300 text-sm mt-5">
                <input type="checkbox" checked={edit.fraccionable} onChange={e => setEdit({ ...edit, fraccionable: e.target.checked })} /> Fraccionable (kg)
              </label>
              <label className="flex items-center gap-2 text-slate-300 text-sm mt-5">
                <input type="checkbox" checked={edit.precio_variable} onChange={e => setEdit({ ...edit, precio_variable: e.target.checked })} /> Precio variable
              </label>
              <label className="flex items-center gap-2 text-slate-300 text-sm col-span-2">
                <input type="checkbox" checked={edit.activo} onChange={e => setEdit({ ...edit, activo: e.target.checked })} /> Activo
              </label>
            </div>
            <div className="px-5 py-4 border-t border-slate-800 flex gap-2">
              <button onClick={guardar} className="flex-1 bg-blue-600 hover:bg-blue-500 rounded-xl py-2.5 font-medium">Guardar</button>
              {edit.id && <button onClick={() => borrar(edit.id!)} className="px-4 rounded-xl border border-red-700 text-red-400 hover:bg-red-900/30">Eliminar</button>}
              <button onClick={() => setEdit(null)} className="px-4 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
