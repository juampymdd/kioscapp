'use client'
import { useEffect, useState } from 'react'
import { icons, Package, Tags, type LucideProps } from 'lucide-react'
import type { ComponentType } from 'react'
import IconPicker from '../_components/IconPicker'
import PageHeader from '../_components/PageHeader'
import { useConfirm } from '../_components/confirm'

type Categoria = {
  id: string; nombre: string; icono: string; color: string | null; orden: number; activo: boolean
}

function Icono({ name, size = 18 }: { name: string; size?: number }) {
  const Cmp = (icons as Record<string, ComponentType<LucideProps>>)[name] ?? Package
  return <Cmp size={size} />
}

export default function CategoriasPage() {
  const confirm = useConfirm()
  const [items, setItems] = useState<Categoria[]>([])
  const [edit, setEdit] = useState<Partial<Categoria> | null>(null)

  async function cargar() {
    const r = await fetch('/api/categorias'); setItems(await r.json())
  }
  useEffect(() => { cargar() }, [])

  async function guardar() {
    if (!edit?.nombre?.trim()) return
    if (edit.id) {
      await fetch(`/api/categorias/${edit.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: edit.nombre, icono: edit.icono, color: edit.color, orden: edit.orden, activo: edit.activo }) })
    } else {
      await fetch('/api/categorias', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: edit.nombre, icono: edit.icono ?? 'Package', orden: edit.orden ?? 100, activo: true }) })
    }
    setEdit(null); await cargar()
  }
  async function borrar(id: string) {
    const ok = await confirm({
      titulo: `¿Eliminar la categoría "${edit?.nombre ?? ''}"?`,
      mensaje: 'Los productos de esta categoría quedan sin rubro. No se puede deshacer.',
    })
    if (!ok) return
    await fetch(`/api/categorias/${id}`, { method: 'DELETE' }); setEdit(null); await cargar()
  }

  return (
    <div className="text-slate-50">
      <PageHeader Icon={Tags} title="Categorías" subtitle="Rubros con ícono, sincronizados con las cajas"
        actions={
          <button onClick={() => setEdit({ nombre: '', icono: 'Package', orden: (items.at(-1)?.orden ?? 0) + 1, activo: true })}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors">
            + Nueva categoría
          </button>
        }
      />

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mb-6">
        {items.map(c => (
          <button key={c.id} onClick={() => setEdit({ ...c })}
            className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-colors
              ${c.activo ? 'border-slate-800 bg-slate-900 hover:border-slate-700' : 'border-slate-800 bg-slate-900 opacity-50'}`}>
            <span className="w-10 h-10 grid place-items-center rounded-xl bg-blue-600/15 text-blue-300 shrink-0"><Icono name={c.icono} /></span>
            <div className="min-w-0">
              <p className="font-semibold truncate">{c.nombre}</p>
              <p className="text-slate-500 text-xs">orden {c.orden}{c.activo ? '' : ' · inactiva'}</p>
            </div>
          </button>
        ))}
        {items.length === 0 && <p className="text-slate-500 text-sm">Sin categorías.</p>}
      </div>

      {edit && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setEdit(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <span className="w-8 h-8 grid place-items-center rounded-lg bg-blue-600/15 text-blue-300"><Icono name={edit.icono ?? 'Package'} size={16} /></span>
              {edit.id ? 'Editar categoría' : 'Nueva categoría'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-xs block mb-1">Nombre</label>
                <input value={edit.nombre ?? ''} onChange={e => setEdit({ ...edit, nombre: e.target.value })} autoFocus
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-slate-400 text-xs block mb-1">Ícono</label>
                <IconPicker value={edit.icono ?? 'Package'} onChange={n => setEdit({ ...edit, icono: n })} />
              </div>
              <div className="flex items-center gap-4">
                <label className="text-slate-400 text-xs">Orden
                  <input type="number" value={edit.orden ?? 100} onChange={e => setEdit({ ...edit, orden: Number(e.target.value) })}
                    className="mt-1 block w-24 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-50 text-sm" />
                </label>
                <label className="flex items-center gap-2 text-slate-300 text-sm mt-5">
                  <input type="checkbox" checked={edit.activo ?? true} onChange={e => setEdit({ ...edit, activo: e.target.checked })} /> Activa
                </label>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
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
