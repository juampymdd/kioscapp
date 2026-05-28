import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle, Plus } from 'lucide-react'
import type { Producto, Stock } from '@kioscapp/shared'
import { getDataStore } from '../store/dataStore'

interface Row {
  producto: Producto
  stock: Stock | null
  editCantidad: string
  editAlerta: string
  dirty: boolean
}

export default function StockScreen() {
  const [rows, setRows] = useState<Row[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [guardando, setGuardando] = useState<string | null>(null)

  async function cargar() {
    const data = await getDataStore().getProductosConStock()
    setRows(data.map(({ producto, stock }) => ({
      producto,
      stock,
      editCantidad: stock ? String(stock.cantidad) : '0',
      editAlerta: stock ? String(stock.alerta_minimo) : '5',
      dirty: false,
    })))
  }

  useEffect(() => { cargar() }, [])

  function updateRow(id: string, patch: Partial<Row>) {
    setRows(prev => prev.map(r => r.producto.id === id ? { ...r, ...patch, dirty: true } : r))
  }

  async function guardarRow(row: Row) {
    setGuardando(row.producto.id)
    try {
      const cantidad = parseFloat(row.editCantidad.replace(',', '.')) || 0
      const alerta = parseFloat(row.editAlerta.replace(',', '.')) || 0
      await getDataStore().setStock(row.producto.id, cantidad, alerta)
      setRows(prev => prev.map(r =>
        r.producto.id === row.producto.id ? { ...r, dirty: false } : r,
      ))
    } finally {
      setGuardando(null)
    }
  }

  const filtradas = rows.filter(r => {
    const q = busqueda.toLowerCase()
    return !q || r.producto.descripcion.toLowerCase().includes(q)
  })

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 shrink-0">
        <h1 className="text-white font-semibold">Stock</h1>
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar producto…"
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
                     text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1
                     focus:ring-blue-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-900 text-slate-400 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2">Producto</th>
              <th className="text-center px-4 py-2 w-36">Cantidad</th>
              <th className="text-center px-4 py-2 w-36">Alerta mín.</th>
              <th className="text-center px-4 py-2 w-24">Estado</th>
              <th className="px-4 py-2 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map(row => {
              const cant = parseFloat(row.editCantidad.replace(',', '.')) || 0
              const alerta = parseFloat(row.editAlerta.replace(',', '.')) || 0
              const bajo = cant <= alerta
              const saving = guardando === row.producto.id

              return (
                <tr
                  key={row.producto.id}
                  className={`border-b border-slate-800 transition-colors
                              ${bajo ? 'bg-amber-950/20' : ''}`}
                >
                  <td className="px-4 py-2.5 text-white">{row.producto.descripcion}</td>

                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1 justify-center">
                      <button
                        onClick={() => {
                          const v = Math.max(0, cant - 1)
                          updateRow(row.producto.id, { editCantidad: String(v) })
                        }}
                        className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-white
                                   text-xs font-bold cursor-pointer flex items-center justify-center"
                      >
                        <Plus size={12} className="rotate-45" />
                      </button>
                      <input
                        type="text"
                        value={row.editCantidad}
                        onChange={e => updateRow(row.producto.id, { editCantidad: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && guardarRow(row)}
                        className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1
                                   text-white text-center text-sm font-mono
                                   focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => {
                          const v = cant + 1
                          updateRow(row.producto.id, { editCantidad: String(v) })
                        }}
                        className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-white
                                   text-xs font-bold cursor-pointer flex items-center justify-center"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </td>

                  <td className="px-4 py-2.5">
                    <input
                      type="text"
                      value={row.editAlerta}
                      onChange={e => updateRow(row.producto.id, { editAlerta: e.target.value })}
                      onKeyDown={e => e.key === 'Enter' && guardarRow(row)}
                      className="w-20 mx-auto block bg-slate-800 border border-slate-700 rounded px-2 py-1
                                 text-white text-center text-sm font-mono
                                 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>

                  <td className="px-4 py-2.5 text-center">
                    {bajo
                      ? <span className="inline-flex items-center gap-1 text-amber-400 text-xs"><AlertTriangle size={12} />Bajo</span>
                      : <span className="inline-flex items-center gap-1 text-emerald-400 text-xs"><CheckCircle size={12} />OK</span>
                    }
                  </td>

                  <td className="px-4 py-2.5 text-right">
                    {row.dirty && (
                      <button
                        onClick={() => guardarRow(row)}
                        disabled={!!saving}
                        className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1
                                   rounded cursor-pointer transition-colors disabled:opacity-50"
                      >
                        {saving ? '…' : 'Guardar'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
