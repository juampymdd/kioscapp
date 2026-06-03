import { useEffect, useState } from 'react'
import { ClipboardList, Copy, Printer, Check, X, ChevronDown, ChevronRight } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import type { Pedido, PedidoItem, Proveedor } from '@kioscapp/shared'
import type { FilaReposicion } from '../store/dataStore'
import { getDataStore } from '../store/dataStore'
import ScreenHeader from '../components/ScreenHeader'
import Skeleton from '../components/Skeleton'
import { formatCentavos } from '../lib/money'
import { pedidoTexto } from '../lib/pedido'

type Tab = 'reposicion' | 'pedidos'

function qtyNum(s: string | undefined): number {
  return s ? parseFloat(s.replace(',', '.')) || 0 : 0
}

export default function ReposicionScreen() {
  const [tab, setTab] = useState<Tab>('reposicion')

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <ScreenHeader Icon={ClipboardList} title="Reposición" subtitle="Qué pedir y a quién, y tus pedidos" />

      <div className="flex gap-1 px-5 pt-3 border-b border-slate-800 shrink-0">
        {([['reposicion', 'Qué pedir'], ['pedidos', 'Pedidos']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm font-medium -mb-px border-b-2 cursor-pointer transition-colors
                        ${tab === id ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'reposicion' ? <ReposicionTab /> : <PedidosTab />}
      </div>
    </div>
  )
}

/* ── Tab: qué pedir ───────────────────────────────────────────────────────── */

function ReposicionTab() {
  const [filas, setFilas] = useState<FilaReposicion[]>([])
  const [cargando, setCargando] = useState(true)
  const [qty, setQty] = useState<Record<string, string>>({})
  const [comercio, setComercio] = useState('KioscApp')
  const [impresora, setImpresora] = useState<string | null>(null)
  const [ancho, setAncho] = useState<'58' | '80'>('58')
  const [pedidoModal, setPedidoModal] = useState<{ texto: string } | null>(null)

  async function cargar() {
    try {
      const data = await getDataStore().getReposicion()
      setFilas(data)
      const def: Record<string, string> = {}
      for (const f of data) {
        const faltante = Math.max(f.stock.alerta_minimo - f.stock.cantidad, 1)
        def[`${f.proveedor.id}:${f.producto.id}`] = String(faltante)
      }
      setQty(def)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
    getDataStore().getConfig('nombre_comercio').then(v => v && setComercio(v))
    getDataStore().getConfig('impresora').then(setImpresora)
    getDataStore().getConfig('ancho_papel').then(v => setAncho(v === '80' ? '80' : '58'))
  }, [])

  // Agrupar por proveedor
  const grupos = new Map<string, { proveedor: Proveedor; filas: FilaReposicion[] }>()
  for (const f of filas) {
    if (!grupos.has(f.proveedor.id)) grupos.set(f.proveedor.id, { proveedor: f.proveedor, filas: [] })
    grupos.get(f.proveedor.id)!.filas.push(f)
  }

  async function armarPedido(g: { proveedor: Proveedor; filas: FilaReposicion[] }) {
    const store = getDataStore()
    const lid = (await store.getConfig('local_id')) ?? 'local-demo'
    const ts = new Date().toISOString()
    const pedidoId = crypto.randomUUID()

    const items = g.filas
      .map(f => ({ f, cant: qtyNum(qty[`${g.proveedor.id}:${f.producto.id}`]) }))
      .filter(x => x.cant > 0)
      .map(({ f, cant }) => ({
        id: crypto.randomUUID(),
        created_at: ts,
        local_id: lid,
        pedido_id: pedidoId,
        producto_id: f.producto.id,
        descripcion: f.producto.descripcion,
        cantidad: cant,
        costo_unit_centavos: f.costo_centavos,
        subtotal_centavos: Math.round(cant * f.costo_centavos),
      }))

    if (items.length === 0) return
    const total = items.reduce((s, i) => s + i.subtotal_centavos, 0)

    await store.crearPedido(
      { id: pedidoId, proveedor_id: g.proveedor.id, estado: 'pendiente', total_centavos: total, recibido_at: null, created_at: ts, updated_at: ts, local_id: lid, deleted_at: null },
      items,
    )

    const texto = pedidoTexto({
      proveedor: g.proveedor.nombre,
      comercio,
      fecha: new Date().toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      items: items.map(i => ({ descripcion: i.descripcion, cantidad: i.cantidad, costo_unit_centavos: i.costo_unit_centavos, subtotal_centavos: i.subtotal_centavos })),
      total_centavos: total,
    })
    setPedidoModal({ texto })
  }

  if (cargando) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl bg-slate-800" />)}
      </div>
    )
  }

  if (grupos.size === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-1">
        <ClipboardList size={40} className="text-slate-600 mb-2" />
        <p className="text-sm font-medium text-slate-300">Nada para reponer</p>
        <p className="text-xs">Aparece acá cuando un producto con proveedor llega a su stock mínimo.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {[...grupos.values()].map(g => {
        const totalProv = g.filas.reduce((s, f) => s + Math.round(qtyNum(qty[`${g.proveedor.id}:${f.producto.id}`]) * f.costo_centavos), 0)
        return (
          <section key={g.proveedor.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
              <div className="min-w-0">
                <h2 className="text-white font-semibold truncate">{g.proveedor.nombre}</h2>
                <p className="text-slate-500 text-xs">{g.filas.length} producto{g.filas.length !== 1 ? 's' : ''} a reponer</p>
              </div>
              <button
                onClick={() => armarPedido(g)}
                className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-3 py-2 rounded-lg cursor-pointer transition-colors"
              >
                Armar pedido
              </button>
            </div>
            <table className="w-full text-sm">
              <thead className="text-slate-500 text-xs uppercase tracking-wide">
                <tr className="border-b border-slate-800 text-left">
                  <th className="px-5 py-2 font-medium">Producto</th>
                  <th className="px-3 py-2 font-medium text-right">Stock</th>
                  <th className="px-3 py-2 font-medium text-right">Costo</th>
                  <th className="px-3 py-2 font-medium text-center w-24">Pedir</th>
                  <th className="px-5 py-2 font-medium text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {g.filas.map(f => {
                  const key = `${g.proveedor.id}:${f.producto.id}`
                  const cant = qtyNum(qty[key])
                  return (
                    <tr key={f.producto.id}>
                      <td className="px-5 py-2.5 text-white">{f.producto.descripcion}</td>
                      <td className="px-3 py-2.5 text-right text-amber-300 tabular-nums">{f.stock.cantidad}</td>
                      <td className="px-3 py-2.5 text-right text-slate-400 tabular-nums">{formatCentavos(f.costo_centavos)}</td>
                      <td className="px-3 py-2.5 text-center">
                        <input
                          type="text" inputMode="decimal" value={qty[key] ?? ''}
                          onChange={e => setQty(prev => ({ ...prev, [key]: e.target.value }))}
                          className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-center text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-5 py-2.5 text-right text-white tabular-nums">{formatCentavos(Math.round(cant * f.costo_centavos))}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-800">
                  <td colSpan={4} className="px-5 py-2.5 text-right text-slate-400 text-sm">Total estimado</td>
                  <td className="px-5 py-2.5 text-right text-blue-400 font-bold tabular-nums">{formatCentavos(totalProv)}</td>
                </tr>
              </tfoot>
            </table>
          </section>
        )
      })}

      {pedidoModal && (
        <PedidoAccionesModal
          texto={pedidoModal.texto}
          impresora={impresora}
          ancho={ancho}
          onClose={() => { setPedidoModal(null); cargar() }}
        />
      )}
    </div>
  )
}

/* ── Modal de acciones del pedido recién armado ───────────────────────────── */

function PedidoAccionesModal({ texto, impresora, ancho, onClose }: {
  texto: string; impresora: string | null; ancho: '58' | '80'; onClose: () => void
}) {
  const [copiado, setCopiado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function copiar() {
    try { await navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 1500) }
    catch { setError('No se pudo copiar') }
  }
  async function imprimir() {
    if (!impresora) { setError('No hay impresora configurada'); return }
    try { await invoke('imprimir_texto', { impresora, texto, ancho }) }
    catch (e) { setError(String(e)) }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white font-bold text-lg">Pedido guardado</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer"><X size={20} /></button>
        </div>
        <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-300 text-xs whitespace-pre-wrap mb-4 max-h-60 overflow-y-auto">{texto}</pre>
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={copiar} className="flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-600 text-slate-200 hover:bg-slate-800 font-medium cursor-pointer transition-colors">
            {copiado ? <><Check size={16} /> Copiado</> : <><Copy size={16} /> Copiar</>}
          </button>
          <button onClick={imprimir} disabled={!impresora} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold cursor-pointer transition-colors">
            <Printer size={16} /> Imprimir
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Tab: pedidos (historial) ─────────────────────────────────────────────── */

function PedidosTab() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [provs, setProvs] = useState<Record<string, string>>({})
  const [cargando, setCargando] = useState(true)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [items, setItems] = useState<Record<string, PedidoItem[]>>({})

  async function cargar() {
    try {
      const [peds, proveedores] = await Promise.all([
        getDataStore().getPedidos(),
        getDataStore().getProveedores(),
      ])
      setPedidos(peds)
      setProvs(Object.fromEntries(proveedores.map(p => [p.id, p.nombre])))
    } finally {
      setCargando(false)
    }
  }
  useEffect(() => { cargar() }, [])

  async function toggle(id: string) {
    if (expandido === id) { setExpandido(null); return }
    setExpandido(id)
    if (!items[id]) setItems(prev => ({ ...prev, [id]: [] })) // placeholder
    const its = await getDataStore().getPedidoItems(id)
    setItems(prev => ({ ...prev, [id]: its }))
  }

  async function recibir(id: string) {
    await getDataStore().marcarPedidoRecibido(id)
    await cargar()
  }

  if (cargando) {
    return <div className="max-w-3xl mx-auto p-6 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl bg-slate-800" />)}</div>
  }
  if (pedidos.length === 0) {
    return <div className="flex items-center justify-center h-full text-slate-400 text-sm">Todavía no armaste ningún pedido.</div>
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-2">
      {pedidos.map(p => {
        const abierto = expandido === p.id
        return (
          <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <button onClick={() => toggle(p.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer hover:bg-slate-800/40 transition-colors">
              {abierto ? <ChevronDown size={16} className="text-slate-500 shrink-0" /> : <ChevronRight size={16} className="text-slate-500 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{provs[p.proveedor_id] ?? 'Proveedor'}</p>
                <p className="text-slate-500 text-xs">{new Date(p.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.estado === 'recibido' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
                {p.estado === 'recibido' ? 'Recibido' : 'Pendiente'}
              </span>
              <span className="text-white font-semibold tabular-nums w-24 text-right">{formatCentavos(p.total_centavos)}</span>
            </button>
            {abierto && (
              <div className="border-t border-slate-800 px-4 py-3">
                {(items[p.id] ?? []).map(it => (
                  <div key={it.id} className="flex justify-between text-sm py-1">
                    <span className="text-slate-300">{Number.isInteger(it.cantidad) ? it.cantidad : it.cantidad}× {it.descripcion}</span>
                    <span className="text-slate-400 tabular-nums">{formatCentavos(it.subtotal_centavos)}</span>
                  </div>
                ))}
                {p.estado === 'pendiente' && (
                  <button onClick={() => recibir(p.id)} className="mt-3 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-3 py-2 rounded-lg cursor-pointer transition-colors">
                    <Check size={15} /> Marcar recibido (suma stock)
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
