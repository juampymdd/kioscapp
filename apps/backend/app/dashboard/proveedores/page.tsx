'use client'
import { useEffect, useState } from 'react'
import { Truck } from 'lucide-react'
import PageHeader from '../_components/PageHeader'
import Skeleton from '../_components/Skeleton'

type Proveedor = {
  id: string; nombre: string; telefono: string | null; email: string | null; notas: string | null; activo: boolean
}
type Form = { id?: string; nombre: string; telefono: string; email: string; notas: string }

export default function ProveedoresPage() {
  const [items, setItems] = useState<Proveedor[]>([])
  const [cargando, setCargando] = useState(true)
  const [edit, setEdit] = useState<Form | null>(null)

  async function cargar() {
    try { const r = await fetch('/api/proveedores'); setItems(await r.json()) } finally { setCargando(false) }
  }
  useEffect(() => { cargar() }, [])

  function nuevo() { setEdit({ nombre: '', telefono: '', email: '', notas: '' }) }
  function editar(p: Proveedor) { setEdit({ id: p.id, nombre: p.nombre, telefono: p.telefono ?? '', email: p.email ?? '', notas: p.notas ?? '' }) }

  async function guardar() {
    if (!edit || !edit.nombre.trim()) return
    const body = { nombre: edit.nombre, telefono: edit.telefono || null, email: edit.email || null, notas: edit.notas || null }
    if (edit.id) await fetch(`/api/proveedores/${edit.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    else await fetch('/api/proveedores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setEdit(null); await cargar()
  }
  async function borrar(id: string) { await fetch(`/api/proveedores/${id}`, { method: 'DELETE' }); setEdit(null); await cargar() }

  const inputCls = 'mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="text-slate-50">
      <PageHeader Icon={Truck} title="Proveedores" subtitle="Contactos de abastecimiento"
        actions={
          <button onClick={nuevo} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors">
            + Nuevo proveedor
          </button>
        }
      />

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-slate-500 text-xs uppercase tracking-wide border-b border-slate-800 text-left">
            <tr><th className="px-4 py-2.5">Nombre</th><th>Teléfono</th><th>Email</th><th></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {cargando && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}><td className="px-4 py-3" colSpan={4}><Skeleton className="h-4 w-full" /></td></tr>
            ))}
            {!cargando && items.map(p => (
              <tr key={p.id} onClick={() => editar(p)} className="cursor-pointer hover:bg-slate-800/50">
                <td className="px-4 py-2.5 font-medium">{p.nombre}</td>
                <td className="text-slate-400">{p.telefono ?? '—'}</td>
                <td className="text-slate-400">{p.email ?? '—'}</td>
                <td></td>
              </tr>
            ))}
            {!cargando && items.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">Sin proveedores</td></tr>}
          </tbody>
        </table>
      </div>

      {edit && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setEdit(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-800 font-bold text-lg">{edit.id ? 'Editar proveedor' : 'Nuevo proveedor'}</div>
            <div className="p-5 space-y-3">
              <label className="text-xs text-slate-400 block">Nombre
                <input value={edit.nombre} onChange={e => setEdit({ ...edit, nombre: e.target.value })} autoFocus className={inputCls} />
              </label>
              <label className="text-xs text-slate-400 block">Teléfono
                <input value={edit.telefono} onChange={e => setEdit({ ...edit, telefono: e.target.value })} className={inputCls} />
              </label>
              <label className="text-xs text-slate-400 block">Email
                <input type="email" value={edit.email} onChange={e => setEdit({ ...edit, email: e.target.value })} className={inputCls} />
              </label>
              <label className="text-xs text-slate-400 block">Notas
                <textarea value={edit.notas} onChange={e => setEdit({ ...edit, notas: e.target.value })} rows={3} className={inputCls + ' resize-none'} />
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
