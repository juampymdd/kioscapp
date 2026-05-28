import { useEffect, useState } from 'react'
import { Plus, X, Save, Trash2 } from 'lucide-react'
import type { Proveedor } from '@kioscapp/shared'
import { getDataStore } from '../store/dataStore'

const LOCAL_ID = import.meta.env.VITE_LOCAL_ID ?? 'local-demo'

function emptyProveedor(): Proveedor {
  const ts = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    nombre: '',
    telefono: null,
    email: null,
    notas: null,
    activo: true,
    created_at: ts,
    updated_at: ts,
    local_id: LOCAL_ID,
    sync_status: 'pending',
    deleted_at: null,
  }
}

export default function ProveedoresScreen() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [editando, setEditando] = useState<Proveedor | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function cargar() {
    setProveedores(await getDataStore().getProveedores())
  }

  useEffect(() => { cargar() }, [])

  function seleccionar(p: Proveedor) {
    setEditando({ ...p })
  }

  function nuevo() {
    setEditando(emptyProveedor())
  }

  async function guardar() {
    if (!editando || !editando.nombre.trim()) return
    setGuardando(true)
    try {
      await getDataStore().upsertProveedor({
        ...editando,
        updated_at: new Date().toISOString(),
        sync_status: 'pending',
      })
      await cargar()
      setEditando(null)
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(id: string) {
    await getDataStore().deleteProveedor(id)
    await cargar()
    setEditando(null)
  }

  function setField<K extends keyof Proveedor>(key: K, value: Proveedor[K]) {
    if (!editando) return
    setEditando({ ...editando, [key]: value })
  }

  return (
    <div className="flex h-full bg-slate-950">
      {/* Lista */}
      <div className="flex flex-col flex-1 min-w-0 border-r border-slate-800">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
          <h1 className="text-white font-semibold">Proveedores</h1>
          <button
            onClick={nuevo}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white
                       text-sm font-medium px-3 py-2 rounded-lg cursor-pointer transition-colors"
          >
            <Plus size={16} /> Nuevo
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {proveedores.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <p className="text-sm">No hay proveedores cargados</p>
              <button
                onClick={nuevo}
                className="mt-3 text-blue-400 hover:text-blue-300 text-sm cursor-pointer"
              >
                Agregar el primero
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-900 text-slate-400 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-2">Nombre</th>
                  <th className="text-left px-4 py-2">Teléfono</th>
                  <th className="text-left px-4 py-2">Email</th>
                </tr>
              </thead>
              <tbody>
                {proveedores.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => seleccionar(p)}
                    className={`border-b border-slate-800 cursor-pointer transition-colors
                                ${editando?.id === p.id ? 'bg-blue-900/20' : 'hover:bg-slate-800/50'}`}
                  >
                    <td className="px-4 py-3 text-white font-medium">{p.nombre}</td>
                    <td className="px-4 py-3 text-slate-400">{p.telefono ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{p.email ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="shrink-0 px-4 py-2 border-t border-slate-800 text-slate-500 text-xs">
          {proveedores.length} proveedor{proveedores.length !== 1 ? 'es' : ''}
        </div>
      </div>

      {/* Panel de edición */}
      {editando ? (
        <div className="w-80 shrink-0 flex flex-col bg-slate-900">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <h2 className="text-white font-semibold text-sm">
              {proveedores.find(p => p.id === editando.id) ? 'Editar proveedor' : 'Nuevo proveedor'}
            </h2>
            <button onClick={() => setEditando(null)} className="text-slate-400 hover:text-white cursor-pointer">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <label className="text-slate-400 text-xs block mb-1">Nombre *</label>
              <input
                type="text"
                value={editando.nombre}
                onChange={e => setField('nombre', e.target.value)}
                autoFocus
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
                           text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-slate-400 text-xs block mb-1">Teléfono</label>
              <input
                type="text"
                value={editando.telefono ?? ''}
                onChange={e => setField('telefono', e.target.value || null)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
                           text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-slate-400 text-xs block mb-1">Email</label>
              <input
                type="email"
                value={editando.email ?? ''}
                onChange={e => setField('email', e.target.value || null)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
                           text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-slate-400 text-xs block mb-1">Notas</label>
              <textarea
                value={editando.notas ?? ''}
                onChange={e => setField('notas', e.target.value || null)}
                rows={4}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
                           text-white text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="shrink-0 p-4 border-t border-slate-800 space-y-2">
            <button
              onClick={guardar}
              disabled={guardando || !editando.nombre.trim()}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500
                         disabled:opacity-40 text-white font-medium py-2.5 rounded-lg
                         cursor-pointer transition-colors text-sm"
            >
              <Save size={16} /> {guardando ? 'Guardando…' : 'Guardar'}
            </button>
            {proveedores.find(p => p.id === editando.id) && (
              <button
                onClick={() => eliminar(editando.id)}
                className="w-full flex items-center justify-center gap-2 border border-red-700
                           text-red-400 hover:bg-red-900/30 font-medium py-2 rounded-lg
                           cursor-pointer transition-colors text-sm"
              >
                <Trash2 size={15} /> Eliminar
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="w-80 shrink-0 flex items-center justify-center text-slate-600 text-sm bg-slate-900">
          Seleccioná un proveedor para editar
        </div>
      )}
    </div>
  )
}
