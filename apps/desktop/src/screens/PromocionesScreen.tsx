import { useEffect, useState } from 'react'
import { Tag, Trash2, Plus } from 'lucide-react'
import type { Descuento, Producto, Categoria } from '@kioscapp/shared'
import { condicionesTexto, horaAMin } from '@kioscapp/shared'
import { getDataStore } from '../store/dataStore'
import { useCartStore } from '../store/cartStore'
import ScreenHeader from '../components/ScreenHeader'
import Skeleton from '../components/Skeleton'
import { formatCentavos } from '../lib/money'

export default function PromocionesScreen() {
  const [promos, setPromos]       = useState<Descuento[]>([])
  const [cargando, setCargando]   = useState(true)
  const [productos, setProductos] = useState<Producto[]>([])
  const [cats, setCats]           = useState<Categoria[]>([])
  const [mostrarForm, setMostrarForm] = useState(false)

  const [objetivo, setObjetivo]   = useState<'categoria' | 'producto'>('categoria')
  const [categoria, setCategoria] = useState<string>('')
  const [productoId, setProductoId] = useState('')
  const [tipo, setTipo]           = useState<'porcentaje' | 'monto'>('porcentaje')
  const [valor, setValor]         = useState('10')

  // Condiciones
  const [dias, setDias]           = useState<number[]>([])   // getDay() 0-6
  const [desde, setDesde]         = useState('')             // YYYY-MM-DD
  const [hasta, setHasta]         = useState('')
  const [horaDesde, setHoraDesde] = useState('')             // HH:MM
  const [horaHasta, setHoraHasta] = useState('')
  const [medioPago, setMedioPago] = useState('')             // '' = cualquiera

  const DIAS_UI = [['Lun', 1], ['Mar', 2], ['Mié', 3], ['Jue', 4], ['Vie', 5], ['Sáb', 6], ['Dom', 0]] as const
  function toggleDia(n: number) {
    setDias(d => d.includes(n) ? d.filter(x => x !== n) : [...d, n])
  }

  async function cargar() {
    try {
      setPromos(await getDataStore().getDescuentos())
    } finally {
      setCargando(false)
    }
  }
  useEffect(() => {
    cargar()
    getDataStore().getProductos().then(setProductos)
    getDataStore().getCategorias().then(cs => { setCats(cs); if (cs[0]) setCategoria(c => c || cs[0].id) })
  }, [])

  /** Refresca el catálogo del carrito tras tocar promos. */
  async function refrescarCarrito() {
    const activos = await getDataStore().getDescuentosActivos()
    useCartStore.getState().setCatalogo(activos)
  }

  async function crear() {
    const n = Number(valor)
    if (!Number.isFinite(n) || n <= 0) return
    if (objetivo === 'producto' && !productoId) return
    const ts = new Date().toISOString()
    const d: Descuento = {
      id: crypto.randomUUID(),
      user_id: '',
      sucursal_id: (await getDataStore().getConfig('sucursal_id')) ?? null,
      objetivo,
      producto_id: objetivo === 'producto' ? productoId : null,
      categoria:   objetivo === 'categoria' ? categoria : null,
      tipo,
      valor: tipo === 'porcentaje' ? n : Math.round(n * 100),
      activo: true,
      created_at: ts,
      updated_at: ts,
      deleted_at: null,
      origen: 'local',
      sync_status: 'pending',
      dias_semana: dias.length ? [...dias].sort((a, b) => a - b).join(',') : null,
      vigencia_desde: desde || null,
      vigencia_hasta: hasta || null,
      hora_desde: horaAMin(horaDesde),
      hora_hasta: horaAMin(horaHasta),
      medio_pago: medioPago || null,
    }
    await getDataStore().upsertDescuento(d)
    setMostrarForm(false)
    setValor('10'); setDias([]); setDesde(''); setHasta(''); setHoraDesde(''); setHoraHasta(''); setMedioPago('')
    await cargar()
    await refrescarCarrito()
  }

  async function toggle(d: Descuento) {
    await getDataStore().setDescuentoActivo(d.id, !d.activo)
    await cargar()
    await refrescarCarrito()
  }

  async function eliminar(d: Descuento) {
    await getDataStore().eliminarDescuentoLocal(d.id)
    await cargar()
    await refrescarCarrito()
  }

  const valorTxt = (d: Descuento) => d.tipo === 'porcentaje' ? `${d.valor}%` : formatCentavos(d.valor)
  const objetivoTxt = (d: Descuento) => d.objetivo === 'producto'
    ? (productos.find(p => p.id === d.producto_id)?.descripcion ?? 'Producto')
    : (cats.find(c => c.id === d.categoria)?.nombre ?? d.categoria ?? '—')

  return (
    <div className="flex flex-col h-full bg-slate-950 overflow-hidden">
      <ScreenHeader Icon={Tag} title="Promociones" subtitle="Descuentos automáticos por producto o categoría">
        <button
          onClick={() => setMostrarForm(m => !m)}
          className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500
                     text-white font-medium cursor-pointer transition-colors"
        >
          <Plus size={15} /> Nueva promo
        </button>
      </ScreenHeader>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Formulario alta */}
        {mostrarForm && (
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 grid grid-cols-2 gap-3 max-w-xl">
            <label className="text-xs text-slate-400">Aplica a
              <select value={objetivo} onChange={e => setObjetivo(e.target.value as 'categoria' | 'producto')}
                className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white">
                <option value="categoria">Categoría</option>
                <option value="producto">Producto</option>
              </select>
            </label>

            {objetivo === 'categoria' ? (
              <label className="text-xs text-slate-400">Categoría
                <select value={categoria} onChange={e => setCategoria(e.target.value)}
                  className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white">
                  {cats.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </label>
            ) : (
              <label className="text-xs text-slate-400">Producto
                <select value={productoId} onChange={e => setProductoId(e.target.value)}
                  className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white">
                  <option value="">Elegí…</option>
                  {productos.map(p => <option key={p.id} value={p.id}>{p.descripcion}</option>)}
                </select>
              </label>
            )}

            <label className="text-xs text-slate-400">Tipo
              <select value={tipo} onChange={e => setTipo(e.target.value as 'porcentaje' | 'monto')}
                className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white">
                <option value="porcentaje">Porcentaje (%)</option>
                <option value="monto">Monto ($)</option>
              </select>
            </label>

            <label className="text-xs text-slate-400">Valor {tipo === 'porcentaje' ? '(%)' : '($)'}
              <input type="number" value={valor} onChange={e => setValor(e.target.value)}
                className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white" />
            </label>

            {/* Condiciones */}
            <div className="col-span-2 border-t border-slate-800 pt-3">
              <p className="text-xs text-slate-500 mb-2">Condiciones (opcionales)</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {DIAS_UI.map(([lbl, n]) => (
                  <button key={n} type="button" onClick={() => toggleDia(n)}
                    className={`text-xs px-2.5 py-1 rounded-lg cursor-pointer transition-colors
                      ${dias.includes(n) ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                    {lbl}
                  </button>
                ))}
                <span className="text-[11px] text-slate-600 self-center ml-1">{dias.length ? '' : 'todos los días'}</span>
              </div>
            </div>

            <label className="text-xs text-slate-400">Desde (fecha)
              <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
                className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white" />
            </label>
            <label className="text-xs text-slate-400">Hasta (fecha)
              <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
                className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white" />
            </label>

            <label className="text-xs text-slate-400">Desde (hora)
              <input type="time" value={horaDesde} onChange={e => setHoraDesde(e.target.value)}
                className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white" />
            </label>
            <label className="text-xs text-slate-400">Hasta (hora)
              <input type="time" value={horaHasta} onChange={e => setHoraHasta(e.target.value)}
                className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white" />
            </label>

            <label className="text-xs text-slate-400 col-span-2">Medio de pago
              <select value={medioPago} onChange={e => setMedioPago(e.target.value)}
                className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white">
                <option value="">Cualquiera</option>
                <option value="efectivo">Efectivo</option>
                <option value="debito">Débito</option>
                <option value="credito">Crédito</option>
                <option value="qr_mercado_pago">QR / Mercado Pago</option>
              </select>
            </label>

            <div className="col-span-2 flex gap-2">
              <button onClick={crear} className="flex-1 bg-blue-600 hover:bg-blue-500 rounded-xl py-2 text-white font-medium cursor-pointer">
                Guardar promo
              </button>
              <button onClick={() => setMostrarForm(false)} className="px-4 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800 cursor-pointer">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Listado */}
        {cargando ? (
          <div className="divide-y divide-slate-800/60">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`sk-${i}`} className="flex items-center gap-4 py-2.5">
                <Skeleton className="h-4 w-40 bg-slate-800" />
                <Skeleton className="h-4 w-16 bg-slate-800" />
                <Skeleton className="h-4 w-20 bg-slate-800" />
                <Skeleton className="h-5 w-12 rounded-full bg-slate-800" />
                <Skeleton className="h-4 w-14 bg-slate-800" />
              </div>
            ))}
          </div>
        ) : promos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500">
            <Tag size={40} className="mb-2 text-slate-700" />
            <p className="text-sm">Sin promociones. Creá una o cargalas desde la web.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left">
              <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                <th className="py-2">Aplica a</th>
                <th>Descuento</th>
                <th>Cuándo</th>
                <th>Ámbito</th>
                <th>Origen</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {promos.map(d => {
                const local = d.origen === 'local'
                return (
                  <tr key={d.id} className={d.activo ? '' : 'opacity-50'}>
                    <td className="py-2.5 text-white">{objetivoTxt(d)}</td>
                    <td className="text-amber-400 tabular-nums">− {valorTxt(d)}</td>
                    <td className="text-slate-400 text-xs">{condicionesTexto(d) || 'Siempre'}</td>
                    <td className="text-slate-400">{d.sucursal_id ? 'Sucursal' : 'Global'}</td>
                    <td>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${local ? 'bg-blue-900/40 text-blue-300' : 'bg-slate-700 text-slate-300'}`}>
                        {local ? 'Local' : 'Web'}
                      </span>
                    </td>
                    <td>
                      {local ? (
                        <button onClick={() => toggle(d)}
                          className={`text-xs ${d.activo ? 'text-emerald-400' : 'text-slate-500'} cursor-pointer`}>
                          {d.activo ? 'Activa' : 'Inactiva'}
                        </button>
                      ) : (
                        <span className={`text-xs ${d.activo ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {d.activo ? 'Activa' : 'Inactiva'}
                        </span>
                      )}
                    </td>
                    <td className="text-right">
                      {local && (
                        <button onClick={() => eliminar(d)} aria-label="Eliminar promo"
                          className="text-slate-500 hover:text-red-400 cursor-pointer">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        <p className="text-slate-600 text-xs">
          Las promos <span className="text-blue-300">Local</span> se crean acá y se aplican al instante; se sincronizan
          a la sucursal cuando hay conexión. Las <span className="text-slate-300">Web</span> se administran desde el panel central.
        </p>
      </div>
    </div>
  )
}
