'use client'
import { useEffect, useState } from 'react'
import { Package } from 'lucide-react'
import PageHeader from '../_components/PageHeader'
import Skeleton from '../_components/Skeleton'
import { ScrollArea } from '../_components/ui/scroll-area'
import { useConfirm } from '../_components/confirm'

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
  const confirm = useConfirm()
  const [items, setItems] = useState<Producto[]>([])
  const [cats, setCats] = useState<Categoria[]>([])
  const [cargando, setCargando] = useState(true)
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState<Form | null>(null)
  const [pagina, setPagina] = useState(1)
  const [sucs, setSucs] = useState<{ id: string; nombre: string }[]>([])
  // Overrides de precio por sucursal del producto en edición: { sucId: 'precio en pesos' }
  const [precios, setPrecios] = useState<Record<string, string>>({})

  async function cargar() {
    try { const r = await fetch('/api/productos'); setItems(await r.json()) } finally { setCargando(false) }
  }
  useEffect(() => {
    cargar()
    fetch('/api/categorias').then(r => r.json()).then(setCats)
    fetch('/api/sucursales').then(r => r.json()).then(setSucs)
  }, [])

  function nuevo() {
    setPrecios({})
    setEdit({ descripcion: '', categoria: cats[0]?.id ?? 'varios', precioStr: '', codigo_barras: '', fraccionable: false, precio_variable: false, cantidad: 0, activo: true })
  }
  async function editar(p: Producto) {
    setPrecios({})
    setEdit({ id: p.id, descripcion: p.descripcion, categoria: p.categoria, precioStr: (p.precio_centavos / 100).toFixed(2), codigo_barras: p.codigo_barras ?? '', fraccionable: p.fraccionable, precio_variable: p.precio_variable, cantidad: p.cantidad, activo: p.activo })
    const r = await fetch(`/api/productos/${p.id}/precios`)
    const ov: { sucursal_id: string; precio_centavos: number }[] = await r.json()
    setPrecios(Object.fromEntries(ov.map(o => [o.sucursal_id, (o.precio_centavos / 100).toFixed(2)])))
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
    let pid = edit.id
    if (pid) await fetch(`/api/productos/${pid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    else { const r = await fetch('/api/productos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); pid = (await r.json()).id }
    // Overrides de precio por sucursal
    if (pid) {
      const overrides = sucs.map(s => ({ sucursal_id: s.id, precio_centavos: precios[s.id] ? Math.round(Number(precios[s.id].replace(',', '.')) * 100) : null }))
      await fetch(`/api/productos/${pid}/precios`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ overrides }) })
    }
    setEdit(null); await cargar()
  }
  async function borrar(id: string) {
    const ok = await confirm({
      titulo: `¿Eliminar "${edit?.descripcion ?? 'este producto'}"?`,
      mensaje: 'Deja de estar disponible en las cajas. No se puede deshacer.',
    })
    if (!ok) return
    await fetch(`/api/productos/${id}`, { method: 'DELETE' }); setEdit(null); await cargar()
  }

  const catNombre = (id: string) => cats.find(c => c.id === id)?.nombre ?? id
  const filtrados = items.filter(p => !q || p.descripcion.toLowerCase().includes(q.toLowerCase()) || (p.codigo_barras ?? '').includes(q))

  const POR_PAGINA = 15
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const visibles = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA)

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

      <input value={q} onChange={e => { setQ(e.target.value); setPagina(1) }} placeholder="Buscar por nombre o código…"
        className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-50 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <ScrollArea className="max-h-[60vh]">
        <table className="w-full text-sm">
          <thead className="text-slate-500 text-xs uppercase tracking-wide text-left sticky top-0 bg-slate-900 z-10">
            <tr className="border-b border-slate-800">
              <th className="px-4 py-3 font-medium">Descripción</th>
              <th className="px-4 py-3 font-medium">Categoría</th>
              <th className="px-4 py-3 font-medium text-right">Precio</th>
              <th className="px-4 py-3 font-medium text-right">Stock</th>
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {cargando && Array.from({ length: 8 }).map((_, i) => (
              <tr key={i}><td className="px-4 py-3" colSpan={6}><Skeleton className="h-4 w-full" /></td></tr>
            ))}
            {!cargando && visibles.map(p => (
              <tr key={p.id} onClick={() => editar(p)} className={`cursor-pointer hover:bg-slate-800/50 transition-colors ${p.activo ? '' : 'opacity-50'}`}>
                <td className="px-4 py-2.5 font-medium">{p.descripcion}</td>
                <td className="px-4 py-2.5 text-slate-400">{catNombre(p.categoria)}</td>
                <td className="px-4 py-2.5 text-right text-blue-400 tabular-nums whitespace-nowrap">{p.precio_variable ? 'Variable' : pesos(p.precio_centavos)}</td>
                <td className="px-4 py-2.5 text-right text-slate-300 tabular-nums">{p.cantidad}</td>
                <td className="px-4 py-2.5 text-slate-500 text-xs font-mono whitespace-nowrap">{p.codigo_barras ?? '—'}</td>
                <td className="px-4 py-2.5"><span className={`text-xs px-2 py-0.5 rounded-full ${p.activo ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>{p.activo ? 'Activo' : 'Inactivo'}</span></td>
              </tr>
            ))}
            {!cargando && filtrados.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Sin productos</td></tr>}
          </tbody>
        </table>
        </ScrollArea>

        {!cargando && filtrados.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-800 text-sm">
            <span className="text-slate-500 text-xs">
              {(paginaActual - 1) * POR_PAGINA + 1}–{Math.min(paginaActual * POR_PAGINA, filtrados.length)} de {filtrados.length}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={paginaActual <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Anterior
              </button>
              <span className="px-3 text-slate-400 tabular-nums">{paginaActual} / {totalPaginas}</span>
              <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual >= totalPaginas}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Siguiente
              </button>
            </div>
          </div>
        )}
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
              {sucs.length > 0 && (
                <div className="col-span-2 border-t border-slate-800 pt-3">
                  <p className="text-xs text-slate-500 mb-2">Precio por sucursal (opcional — vacío = usa el precio base)</p>
                  <div className="space-y-2">
                    {sucs.map(s => (
                      <div key={s.id} className="flex items-center gap-2">
                        <span className="text-sm text-slate-300 flex-1 truncate">{s.nombre}</span>
                        <input value={precios[s.id] ?? ''} onChange={e => setPrecios(p => ({ ...p, [s.id]: e.target.value }))}
                          inputMode="decimal" placeholder={edit.precioStr || 'base'}
                          className="w-28 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-slate-50 text-sm text-right" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
