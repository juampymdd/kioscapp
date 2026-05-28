import { useEffect, useState } from 'react'
import { Plus, X, Save } from 'lucide-react'
import type { CategoriaProducto, Producto } from '@kioscapp/shared'
import { getDataStore } from '../store/dataStore'
import { formatCentavos, parseCentavos, centavosToInputStr } from '../lib/money'

const CATEGORIAS: CategoriaProducto[] = [
  'bebidas', 'golosinas', 'cigarrillos', 'kiosco',
  'recarga_sube', 'recarga_celular', 'varios',
]

const LOCAL_ID = import.meta.env.VITE_LOCAL_ID ?? 'local-demo'

function emptyProducto(): Producto {
  const ts = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    codigo_barras: null,
    descripcion: '',
    categoria: 'varios',
    precio_centavos: 0,
    fraccionable: false,
    unidad_medida: 'unidad',
    activo: true,
    created_at: ts,
    updated_at: ts,
    local_id: LOCAL_ID,
    sync_status: 'pending',
    deleted_at: null,
  }
}

export default function ProductosScreen() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [mostrarInactivos, setMostrarInactivos] = useState(false)
  const [editando, setEditando] = useState<Producto | null>(null)
  const [precioStr, setPrecioStr] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function cargar() {
    const todos = await getDataStore().getAllProductos()
    setProductos(todos)
  }

  useEffect(() => { cargar() }, [])

  const filtrados = productos.filter(p => {
    if (!mostrarInactivos && !p.activo) return false
    const q = busqueda.toLowerCase()
    return !q || p.descripcion.toLowerCase().includes(q) || (p.codigo_barras ?? '').includes(q)
  })

  function seleccionar(p: Producto) {
    setEditando({ ...p })
    setPrecioStr(centavosToInputStr(p.precio_centavos))
  }

  function nuevo() {
    const p = emptyProducto()
    setEditando(p)
    setPrecioStr('0,00')
  }

  async function guardar() {
    if (!editando || !editando.descripcion.trim()) return
    setGuardando(true)
    try {
      const p: Producto = {
        ...editando,
        precio_centavos: parseCentavos(precioStr),
        updated_at: new Date().toISOString(),
        sync_status: 'pending',
      }
      await getDataStore().upsertProducto(p)
      await cargar()
      setEditando(null)
    } finally {
      setGuardando(false)
    }
  }

  async function toggleActivo() {
    if (!editando) return
    const p: Producto = {
      ...editando,
      activo: !editando.activo,
      updated_at: new Date().toISOString(),
      sync_status: 'pending',
    }
    await getDataStore().upsertProducto(p)
    await cargar()
    setEditando(p)
  }

  return (
    <div className="flex h-full bg-slate-950">
      {/* Lista */}
      <div className="flex flex-col flex-1 min-w-0 border-r border-slate-800">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 shrink-0">
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o código…"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
                       text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1
                       focus:ring-blue-500"
          />
          <label className="flex items-center gap-2 text-slate-400 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={mostrarInactivos}
              onChange={e => setMostrarInactivos(e.target.checked)}
              className="rounded"
            />
            Inactivos
          </label>
          <button
            onClick={nuevo}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white
                       text-sm font-medium px-3 py-2 rounded-lg cursor-pointer transition-colors"
          >
            <Plus size={16} /> Nuevo
          </button>
        </div>

        {/* Tabla */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900 text-slate-400 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2">Descripción</th>
                <th className="text-left px-4 py-2">Categoría</th>
                <th className="text-right px-4 py-2">Precio</th>
                <th className="text-left px-4 py-2">Código</th>
                <th className="text-center px-4 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(p => (
                <tr
                  key={p.id}
                  onClick={() => seleccionar(p)}
                  className={`border-b border-slate-800 cursor-pointer transition-colors
                              ${editando?.id === p.id ? 'bg-blue-900/20' : 'hover:bg-slate-800/50'}
                              ${!p.activo ? 'opacity-40' : ''}`}
                >
                  <td className="px-4 py-2.5 text-white font-medium">{p.descripcion}</td>
                  <td className="px-4 py-2.5 text-slate-400 capitalize">{p.categoria.replace('_', ' ')}</td>
                  <td className="px-4 py-2.5 text-blue-400 text-right font-mono">
                    {formatCentavos(p.precio_centavos)}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">
                    {p.codigo_barras ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.activo ? 'bg-emerald-900/40 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    {busqueda ? `Sin resultados para "${busqueda}"` : 'Sin productos'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="shrink-0 px-4 py-2 border-t border-slate-800 text-slate-500 text-xs">
          {filtrados.length} producto{filtrados.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Panel de edición */}
      {editando ? (
        <div className="w-80 shrink-0 flex flex-col bg-slate-900">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <h2 className="text-white font-semibold text-sm">
              {editando.created_at === editando.updated_at ? 'Nuevo producto' : 'Editar producto'}
            </h2>
            <button onClick={() => setEditando(null)} className="text-slate-400 hover:text-white cursor-pointer">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <label className="text-slate-400 text-xs block mb-1">Descripción *</label>
              <input
                type="text"
                value={editando.descripcion}
                onChange={e => setEditando({ ...editando, descripcion: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
                           text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-slate-400 text-xs block mb-1">Código de barras</label>
              <input
                type="text"
                value={editando.codigo_barras ?? ''}
                onChange={e => setEditando({ ...editando, codigo_barras: e.target.value || null })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
                           text-white text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-slate-400 text-xs block mb-1">Categoría</label>
              <select
                value={editando.categoria}
                onChange={e => setEditando({ ...editando, categoria: e.target.value as CategoriaProducto })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
                           text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {CATEGORIAS.map(c => (
                  <option key={c} value={c}>{c.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 text-xs block mb-1">Precio ($)</label>
              <input
                type="text"
                inputMode="decimal"
                value={precioStr}
                onChange={e => setPrecioStr(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
                           text-white text-sm text-right font-mono
                           focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {precioStr && (
                <p className="text-slate-500 text-xs mt-1 text-right">
                  = {formatCentavos(parseCentavos(precioStr))}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-slate-300 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={editando.fraccionable}
                  onChange={e => setEditando({
                    ...editando,
                    fraccionable: e.target.checked,
                    unidad_medida: e.target.checked ? 'kg' : 'unidad',
                  })}
                />
                Fraccionable (kg)
              </label>
            </div>
          </div>

          <div className="shrink-0 p-4 border-t border-slate-800 space-y-2">
            <button
              onClick={guardar}
              disabled={guardando || !editando.descripcion.trim()}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500
                         disabled:opacity-40 text-white font-medium py-2.5 rounded-lg
                         cursor-pointer transition-colors text-sm"
            >
              <Save size={16} /> {guardando ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              onClick={toggleActivo}
              className={`w-full py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors border
                          ${editando.activo
                            ? 'border-red-700 text-red-400 hover:bg-red-900/30'
                            : 'border-emerald-700 text-emerald-400 hover:bg-emerald-900/30'
                          }`}
            >
              {editando.activo ? 'Desactivar' : 'Reactivar'}
            </button>
          </div>
        </div>
      ) : (
        <div className="w-80 shrink-0 flex items-center justify-center text-slate-600 text-sm bg-slate-900">
          Seleccioná un producto para editar
        </div>
      )}
    </div>
  )
}
