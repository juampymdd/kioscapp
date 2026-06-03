import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Printer, X, CheckCircle } from 'lucide-react'
import type { DatosTicket, AnchoPapel } from '../lib/ticket'
import { buildLineas, colsPorAncho } from '../lib/ticket'
import { getDataStore } from '../store/dataStore'

interface Props {
  datos: DatosTicket
  impresora: string | null
  ancho?: AnchoPapel
  onDone: () => void
}

export default function TicketModal({ datos, impresora, ancho = '58', onDone }: Props) {
  const [imprimiendo, setImprimiendo] = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [impreso, setImpreso]         = useState(false)

  // Config editable inline (arranca con lo recibido, persiste al cambiar)
  const [impresoras,  setImpresoras]  = useState<string[]>([])
  const [impresoraSel, setImpresoraSel] = useState(impresora ?? '')
  const [anchoSel,    setAnchoSel]    = useState<AnchoPapel>(ancho)

  useEffect(() => {
    invoke<string[]>('listar_impresoras').then(setImpresoras).catch(() => {})
  }, [])

  const cols = colsPorAncho(anchoSel)
  const lineas = buildLineas(datos, anchoSel)

  function cambiarImpresora(v: string) {
    setImpresoraSel(v)
    getDataStore().setConfig('impresora', v).catch(() => {})
  }

  function cambiarAncho(v: AnchoPapel) {
    setAnchoSel(v)
    getDataStore().setConfig('ancho_papel', v).catch(() => {})
  }

  async function imprimir() {
    if (!impresoraSel) return
    setImprimiendo(true)
    setError(null)
    try {
      await invoke('imprimir_ticket', { impresora: impresoraSel, datos, ancho: anchoSel })
      setImpreso(true)
      setTimeout(onDone, 1500)
    } catch (e) {
      setError(String(e))
    } finally {
      setImprimiendo(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
          <h2 className="text-white font-bold text-lg">Ticket</h2>
          <button onClick={onDone} className="text-slate-400 hover:text-white cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Ticket preview */}
        <div className="flex-1 overflow-y-auto p-6 flex justify-center items-start">
          <div
            className={`bg-white text-black font-mono leading-5 px-4 py-5
                       shadow-xl shrink-0 select-none w-fit
                       ${anchoSel === '80' ? 'text-[10px]' : 'text-[11px]'}`}
          >
            {lineas.map((l, i) => {
              if (l.tipo === 'sep') {
                return <div key={i} className="whitespace-pre text-gray-400">{l.char.repeat(cols)}</div>
              }
              if (l.grande) {
                const [left, right] = l.texto.trim().split(/\s{2,}/)
                return (
                  <div key={i} className="flex justify-between font-bold text-[17px] leading-7 my-0.5">
                    <span>{left}</span>
                    <span>{right}</span>
                  </div>
                )
              }
              return (
                <div
                  key={i}
                  className={`whitespace-pre ${l.negrita ? 'font-bold' : ''}`}
                >
                  {l.texto}
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 border-t border-slate-800 space-y-3">
          {/* Config discreta: impresora + papel */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Printer size={13} className="shrink-0" />
            {impresoras.length > 0 ? (
              <select
                value={impresoraSel}
                onChange={e => cambiarImpresora(e.target.value)}
                className="flex-1 min-w-0 bg-slate-800/60 border border-slate-700 rounded-md px-2 py-1
                           text-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">Sin impresora</option>
                {impresoras.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            ) : (
              <span className="flex-1 text-slate-500">Sin impresoras detectadas</span>
            )}

            <div className="flex rounded-md overflow-hidden border border-slate-700 shrink-0">
              {(['58', '80'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => cambiarAncho(v)}
                  className={`px-2 py-1 text-xs cursor-pointer transition-colors
                              ${anchoSel === v ? 'bg-blue-600 text-white' : 'bg-slate-800/60 text-slate-400 hover:text-white'}`}
                >
                  {v}mm
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-950/30 border border-red-900 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onDone}
              className="py-3 rounded-xl border border-slate-600 text-slate-300
                         hover:bg-slate-800 font-medium cursor-pointer transition-colors"
            >
              Sin ticket
            </button>
            <button
              onClick={imprimir}
              disabled={!impresoraSel || imprimiendo || impreso}
              className="py-3 rounded-xl bg-blue-600 hover:bg-blue-500
                         disabled:opacity-40 text-white font-bold
                         cursor-pointer transition-colors flex items-center gap-2 justify-center"
            >
              {impreso
                ? <><CheckCircle size={16} /> Impreso</>
                : imprimiendo
                  ? 'Imprimiendo…'
                  : <><Printer size={16} /> Imprimir</>
              }
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
