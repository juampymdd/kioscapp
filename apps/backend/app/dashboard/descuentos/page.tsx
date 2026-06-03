'use client'
import { useEffect, useState } from 'react'
import { horaAMin, minAHora } from '@kioscapp/shared'
import Skeleton from '../_components/Skeleton'

type Descuento = {
  id: string; sucursal_id: string | null; objetivo: 'producto' | 'categoria' | 'todos'
  producto_id: string | null; categoria: string | null
  tipo: 'monto' | 'porcentaje'; valor: number; activo: boolean
  dias_semana: string | null; vigencia_desde: string | null; vigencia_hasta: string | null
  hora_desde: number | null; hora_hasta: number | null; medio_pago: string | null
}

const DIAS_UI: [string, number][] = [['Lun', 1], ['Mar', 2], ['Mié', 3], ['Jue', 4], ['Vie', 5], ['Sáb', 6], ['Dom', 0]]
const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MEDIO_LABELS: Record<string, string> = { efectivo: 'Efectivo', debito: 'Débito', credito: 'Crédito', qr_mercado_pago: 'QR / MP' }

function cuandoTxt(d: Descuento): string {
  const p: string[] = []
  if (d.dias_semana) {
    const ds = d.dias_semana.split(',').filter(Boolean).map(Number)
    if (ds.length && ds.length < 7) p.push(ds.map(n => DIAS_CORTOS[n]).join(', '))
  }
  if (d.vigencia_desde || d.vigencia_hasta) {
    const f = (s: string | null) => s ? s.split('-').reverse().slice(0, 2).join('/') : '…'
    p.push(`${f(d.vigencia_desde)}–${f(d.vigencia_hasta)}`)
  }
  if (d.hora_desde != null || d.hora_hasta != null) p.push(`${minAHora(d.hora_desde) || '00:00'}–${minAHora(d.hora_hasta) || '23:59'}`)
  if (d.medio_pago) p.push(MEDIO_LABELS[d.medio_pago] ?? d.medio_pago)
  return p.join(' · ') || 'Siempre'
}
type Sucursal = { id: string; nombre: string }
type Producto = { id: string; descripcion: string }
type Categoria = { id: string; nombre: string }

export default function DescuentosPage() {
  const [items, setItems] = useState<Descuento[]>([])
  const [cargando, setCargando] = useState(true)
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [form, setForm] = useState({
    sucursal_id: '', objetivo: 'todos' as 'todos' | 'categoria' | 'producto', producto_id: '', categoria: 'bebidas',
    tipo: 'porcentaje', valor: 10,
    dias: [] as number[], desde: '', hasta: '', horaDesde: '', horaHasta: '', medio_pago: '',
  })
  const toggleDia = (n: number) => setForm(f => ({ ...f, dias: f.dias.includes(n) ? f.dias.filter(x => x !== n) : [...f.dias, n] }))

  async function cargar() {
    try {
      const r = await fetch('/api/descuentos'); setItems(await r.json())
    } finally {
      setCargando(false)
    }
  }
  useEffect(() => {
    cargar()
    fetch('/api/sucursales').then(r => r.json()).then(setSucursales)
    fetch('/api/catalog').then(r => r.json()).then(d => setProductos(d.productos ?? []))
    fetch('/api/categorias').then(r => r.json()).then(setCategorias)
  }, [])

  async function crear() {
    const body = {
      sucursal_id: form.sucursal_id || null,
      objetivo: form.objetivo,
      producto_id: form.objetivo === 'producto' ? form.producto_id : null,
      categoria:   form.objetivo === 'categoria' ? form.categoria : null,
      tipo: form.tipo,
      valor: form.tipo === 'porcentaje' ? Number(form.valor) : Math.round(Number(form.valor) * 100),
      dias_semana: form.dias.length ? [...form.dias].sort((a, b) => a - b).join(',') : null,
      vigencia_desde: form.desde || null,
      vigencia_hasta: form.hasta || null,
      hora_desde: horaAMin(form.horaDesde),
      hora_hasta: horaAMin(form.horaHasta),
      medio_pago: form.medio_pago || null,
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
  const objetivoTxt = (d: Descuento) =>
    d.objetivo === 'todos' ? 'Toda la venta'
    : d.objetivo === 'producto' ? (productos.find(p => p.id === d.producto_id)?.descripcion ?? 'Producto')
    : `Categoría: ${categorias.find(c => c.id === d.categoria)?.nombre ?? d.categoria}`

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
          <select value={form.objetivo} onChange={e => setForm({ ...form, objetivo: e.target.value as typeof form.objetivo })}
            className="mt-1 w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-50">
            <option value="todos">Toda la venta</option>
            <option value="categoria">Categoría</option>
            <option value="producto">Producto</option>
          </select>
        </label>
        {form.objetivo === 'todos' ? (
          <div />
        ) : form.objetivo === 'categoria' ? (
          <label className="text-xs text-slate-400">Categoría
            <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}
              className="mt-1 w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-50">
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
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
        {/* Condiciones */}
        <div className="col-span-2 border-t border-slate-700 pt-3">
          <p className="text-xs text-slate-500 mb-2">Condiciones (opcionales)</p>
          <div className="flex flex-wrap gap-1">
            {DIAS_UI.map(([lbl, n]) => (
              <button key={n} type="button" onClick={() => toggleDia(n)}
                className={`text-xs px-2.5 py-1 rounded-lg ${form.dias.includes(n) ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-300 hover:bg-slate-700'}`}>
                {lbl}
              </button>
            ))}
            <span className="text-[11px] text-slate-600 self-center ml-1">{form.dias.length ? '' : 'todos los días'}</span>
          </div>
        </div>
        <label className="text-xs text-slate-400">Desde (fecha)
          <input type="date" value={form.desde} onChange={e => setForm({ ...form, desde: e.target.value })}
            className="mt-1 w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-50" />
        </label>
        <label className="text-xs text-slate-400">Hasta (fecha)
          <input type="date" value={form.hasta} onChange={e => setForm({ ...form, hasta: e.target.value })}
            className="mt-1 w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-50" />
        </label>
        <label className="text-xs text-slate-400">Desde (hora)
          <input type="time" value={form.horaDesde} onChange={e => setForm({ ...form, horaDesde: e.target.value })}
            className="mt-1 w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-50" />
        </label>
        <label className="text-xs text-slate-400">Hasta (hora)
          <input type="time" value={form.horaHasta} onChange={e => setForm({ ...form, horaHasta: e.target.value })}
            className="mt-1 w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-50" />
        </label>
        <label className="text-xs text-slate-400 col-span-2">Medio de pago
          <select value={form.medio_pago} onChange={e => setForm({ ...form, medio_pago: e.target.value })}
            className="mt-1 w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-50">
            <option value="">Cualquiera</option>
            <option value="efectivo">Efectivo</option>
            <option value="debito">Débito</option>
            <option value="credito">Crédito</option>
            <option value="qr_mercado_pago">QR / Mercado Pago</option>
          </select>
        </label>
        <button onClick={crear} className="col-span-2 bg-blue-600 hover:bg-blue-500 rounded-xl py-2 font-medium">
          Agregar descuento
        </button>
      </div>

      <table className="w-full text-sm">
        <thead><tr className="text-slate-400 text-left border-b border-slate-700">
          <th className="py-2">Ámbito</th><th>Objetivo</th><th>Valor</th><th>Cuándo</th><th>Estado</th><th></th>
        </tr></thead>
        <tbody>
          {cargando && Array.from({ length: 5 }).map((_, i) => (
            <tr key={`sk-${i}`} className="border-b border-slate-800">
              <td className="py-2.5"><Skeleton className="h-4 w-32" /></td>
              <td><Skeleton className="h-4 w-40" /></td>
              <td><Skeleton className="h-4 w-12" /></td>
              <td><Skeleton className="h-4 w-16" /></td>
              <td className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
            </tr>
          ))}
          {!cargando && items.map(d => (
            <tr key={d.id} className="border-b border-slate-800">
              <td className="py-2">{ambitoTxt(d)}</td>
              <td>{objetivoTxt(d)}</td>
              <td className="tabular-nums">{valorTxt(d)}</td>
              <td className="text-slate-400 text-xs">{cuandoTxt(d)}</td>
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
          {!cargando && items.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-slate-500">Sin descuentos cargados</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
