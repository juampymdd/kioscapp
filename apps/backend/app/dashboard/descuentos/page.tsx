'use client'
import { useEffect, useState } from 'react'

type Descuento = {
  id: string; sucursal_id: string | null; objetivo: 'producto' | 'categoria'
  producto_id: string | null; categoria: string | null
  tipo: 'monto' | 'porcentaje'; valor: number; activo: boolean
}
type Sucursal = { id: string; nombre: string }
type Producto = { id: string; descripcion: string }

const CATEGORIAS = ['cigarrillos', 'bebidas', 'golosinas', 'kiosco', 'recarga_sube', 'recarga_celular', 'varios']

export default function DescuentosPage() {
  const [items, setItems] = useState<Descuento[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [form, setForm] = useState({
    sucursal_id: '', objetivo: 'categoria', producto_id: '', categoria: 'bebidas',
    tipo: 'porcentaje', valor: 10,
  })

  async function cargar() {
    const r = await fetch('/api/descuentos'); setItems(await r.json())
  }
  useEffect(() => {
    cargar()
    fetch('/api/sucursales').then(r => r.json()).then(setSucursales)
    fetch('/api/catalog').then(r => r.json()).then(d => setProductos(d.productos ?? []))
  }, [])

  async function crear() {
    const body = {
      sucursal_id: form.sucursal_id || null,
      objetivo: form.objetivo,
      producto_id: form.objetivo === 'producto' ? form.producto_id : null,
      categoria:   form.objetivo === 'categoria' ? form.categoria : null,
      tipo: form.tipo,
      valor: form.tipo === 'porcentaje' ? Number(form.valor) : Math.round(Number(form.valor) * 100),
    }
    await fetch('/api/descuentos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    await cargar()
  }
  async function toggle(d: Descuento) {
    await fetch(`/api/descuentos/${d.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activo: !d.activo }) })
    await cargar()
  }
  async function borrar(d: Descuento) {
    await fetch(`/api/descuentos/${d.id}`, { method: 'DELETE' })
    await cargar()
  }

  const valorTxt = (d: Descuento) => d.tipo === 'porcentaje' ? `${d.valor}%` : `$${(d.valor / 100).toFixed(2)}`
  const ambitoTxt = (d: Descuento) => d.sucursal_id ? (sucursales.find(s => s.id === d.sucursal_id)?.nombre ?? 'Sucursal') : 'Global'
  const objetivoTxt = (d: Descuento) => d.objetivo === 'producto'
    ? (productos.find(p => p.id === d.producto_id)?.descripcion ?? 'Producto')
    : `Categoría: ${d.categoria}`

  return (
    <div className="p-6 text-slate-50">
      <h1 className="text-lg font-bold mb-4">Descuentos</h1>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6 grid grid-cols-2 gap-3 max-w-2xl">
        <label className="text-xs text-slate-400">Ámbito
          <select value={form.sucursal_id} onChange={e => setForm({ ...form, sucursal_id: e.target.value })}
            className="mt-1 w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-50">
            <option value="">Global (todas)</option>
            {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-400">Objetivo
          <select value={form.objetivo} onChange={e => setForm({ ...form, objetivo: e.target.value })}
            className="mt-1 w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-50">
            <option value="categoria">Categoría</option>
            <option value="producto">Producto</option>
          </select>
        </label>
        {form.objetivo === 'categoria' ? (
          <label className="text-xs text-slate-400">Categoría
            <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}
              className="mt-1 w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-50">
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        ) : (
          <label className="text-xs text-slate-400">Producto
            <select value={form.producto_id} onChange={e => setForm({ ...form, producto_id: e.target.value })}
              className="mt-1 w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-50">
              <option value="">Elegí…</option>
              {productos.map(p => <option key={p.id} value={p.id}>{p.descripcion}</option>)}
            </select>
          </label>
        )}
        <label className="text-xs text-slate-400">Tipo
          <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}
            className="mt-1 w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-50">
            <option value="porcentaje">Porcentaje (%)</option>
            <option value="monto">Monto ($)</option>
          </select>
        </label>
        <label className="text-xs text-slate-400">Valor {form.tipo === 'porcentaje' ? '(%)' : '($)'}
          <input type="number" value={form.valor} onChange={e => setForm({ ...form, valor: Number(e.target.value) })}
            className="mt-1 w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-50" />
        </label>
        <button onClick={crear} className="col-span-2 bg-blue-600 hover:bg-blue-500 rounded-xl py-2 font-medium">
          Agregar descuento
        </button>
      </div>

      <table className="w-full text-sm">
        <thead><tr className="text-slate-400 text-left border-b border-slate-700">
          <th className="py-2">Ámbito</th><th>Objetivo</th><th>Valor</th><th>Estado</th><th></th>
        </tr></thead>
        <tbody>
          {items.map(d => (
            <tr key={d.id} className="border-b border-slate-800">
              <td className="py-2">{ambitoTxt(d)}</td>
              <td>{objetivoTxt(d)}</td>
              <td className="tabular-nums">{valorTxt(d)}</td>
              <td>
                <button onClick={() => toggle(d)} className={d.activo ? 'text-green-400' : 'text-slate-500'}>
                  {d.activo ? 'Activo' : 'Inactivo'}
                </button>
              </td>
              <td className="text-right">
                <button onClick={() => borrar(d)} className="text-red-400 hover:text-red-300">Eliminar</button>
              </td>
            </tr>
          ))}
          {items.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-slate-500">Sin descuentos cargados</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
