import { useEffect, useState } from 'react'
import { Tags, Plus, Trash2, Save, X } from 'lucide-react'
import type { Categoria } from '@kioscapp/shared'
import { normalizarSlug } from '@kioscapp/shared'
import { getDataStore } from '../store/dataStore'
import ScreenHeader from '../components/ScreenHeader'
import CategoriaIcon from '../components/CategoriaIcon'
import IconPicker from '../components/IconPicker'
import Skeleton from '../components/Skeleton'

const LOCAL_ID = import.meta.env.VITE_LOCAL_ID ?? 'local-demo'

export default function CategoriasScreen() {
  const [cats, setCats]       = useState<Categoria[]>([])
  const [cargando, setCargando] = useState(true)
  const [edit, setEdit]       = useState<Categoria | null>(null)

  async function cargar() {
    try { setCats(await getDataStore().getAllCategorias()) } finally { setCargando(false) }
  }
  useEffect(() => { cargar() }, [])

  function nueva() {
    const ts = new Date().toISOString()
    setEdit({
      id: '', nombre: '', icono: 'Package', color: null,
      orden: (cats.length ? cats[cats.length - 1].orden : 0) + 1, activo: true,
      created_at: ts, updated_at: ts, local_id: LOCAL_ID, sync_status: 'pending', deleted_at: null,
    })
  }

  async function guardar() {
    if (!edit || !edit.nombre.trim()) return
    const id = edit.id || normalizarSlug(edit.nombre)
    await getDataStore().upsertCategoria({ ...edit, id, updated_at: new Date().toISOString(), sync_status: 'pending' })
    setEdit(null)
    await cargar()
  }

  async function borrar(id: string) {
    await getDataStore().eliminarCategoria(id)
    setEdit(null)
    await cargar()
  }

  return (
    <div className="flex h-full bg-slate-950">
      <div className="flex flex-col flex-1 min-w-0 border-r border-slate-800">
        <ScreenHeader Icon={Tags} title="Categorías" subtitle={`${cats.length} categoría${cats.length !== 1 ? 's' : ''}`}>
          <button onClick={nueva}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-3 py-2 rounded-lg cursor-pointer transition-colors">
            <Plus size={16} /> Nueva
          </button>
        </ScreenHeader>

        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2 content-start">
          {cargando && Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[60px] rounded-xl" />
          ))}
          {!cargando && cats.map(c => (
            <button key={c.id} onClick={() => setEdit({ ...c })}
              className={`flex items-center gap-3 p-3 rounded-xl border text-left cursor-pointer transition-colors
                ${edit?.id === c.id ? 'border-blue-500 bg-blue-900/20' : 'border-slate-700 bg-slate-800 hover:bg-slate-700'} ${c.activo ? '' : 'opacity-50'}`}>
              <span className="w-9 h-9 grid place-items-center rounded-lg bg-slate-700/60 text-slate-200 shrink-0">
                <CategoriaIcon name={c.icono} size={18} />
              </span>
              <span className="text-white text-sm font-medium truncate">{c.nombre}</span>
            </button>
          ))}
          {!cargando && cats.length === 0 && (
            <p className="col-span-full text-center text-slate-500 text-sm py-12">Sin categorías</p>
          )}
        </div>
      </div>

      {edit ? (
        <div className="w-80 shrink-0 flex flex-col bg-slate-900">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <h2 className="text-white font-semibold text-sm">{edit.id ? 'Editar categoría' : 'Nueva categoría'}</h2>
            <button onClick={() => setEdit(null)} className="text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <label className="text-slate-400 text-xs block mb-1">Nombre *</label>
              <input value={edit.nombre} onChange={e => setEdit({ ...edit, nombre: e.target.value })} autoFocus
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <div className="text-slate-400 text-xs mb-2 flex items-center gap-2">
                Ícono
                <span className="w-7 h-7 grid place-items-center rounded bg-slate-800 text-blue-300">
                  <CategoriaIcon name={edit.icono} size={16} />
                </span>
              </div>
              <IconPicker value={edit.icono} onChange={n => setEdit({ ...edit, icono: n })} />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">Orden</label>
              <input type="number" value={edit.orden} onChange={e => setEdit({ ...edit, orden: Number(e.target.value) })}
                className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <label className="flex items-center gap-2 text-slate-300 text-sm cursor-pointer">
              <input type="checkbox" checked={edit.activo} onChange={e => setEdit({ ...edit, activo: e.target.checked })} /> Activa
            </label>
          </div>
          <div className="shrink-0 p-4 border-t border-slate-800 space-y-2">
            <button onClick={guardar} disabled={!edit.nombre.trim()}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium py-2.5 rounded-lg cursor-pointer transition-colors text-sm">
              <Save size={16} /> Guardar
            </button>
            {edit.id && (
              <button onClick={() => borrar(edit.id)}
                className="w-full flex items-center justify-center gap-2 border border-red-700 text-red-400 hover:bg-red-900/30 font-medium py-2 rounded-lg cursor-pointer transition-colors text-sm">
                <Trash2 size={15} /> Eliminar
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="w-80 shrink-0 flex items-center justify-center text-slate-600 text-sm bg-slate-900">
          Seleccioná o creá una categoría
        </div>
      )}
    </div>
  )
}
