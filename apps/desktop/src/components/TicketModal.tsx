import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Printer, X, CheckCircle } from 'lucide-react'
import type { DatosTicket } from '../lib/ticket'
import { buildLineas } from '../lib/ticket'

interface Props {
  datos: DatosTicket
  impresora: string | null
  onDone: () => void
}

export default function TicketModal({ datos, impresora, onDone }: Props) {
  const [imprimiendo, setImprimiendo] = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [impreso, setImpreso]         = useState(false)

  const lineas = buildLineas(datos)

  async function imprimir() {
    if (!impresora) return
    setImprimiendo(true)
    setError(null)
    try {
      await invoke('imprimir_ticket', { impresora, datos })
      setImpreso(true)
      // Auto-close after 1.5s on success
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
        <div className="flex-1 overflow-y-auto p-6 flex justify-center">
          <div
            className="bg-white text-black font-mono text-[11px] leading-5 px-4 py-5
                       shadow-xl w-64 shrink-0 select-none"
          >
            {lineas.map((l, i) => {
              if (l.tipo === 'sep') {
                return <div key={i} className="whitespace-pre text-gray-400">{l.char.repeat(32)}</div>
              }
              return (
                <div
                  key={i}
                  className={`whitespace-pre overflow-hidden ${l.negrita ? 'font-bold' : ''}`}
                >
                  {l.texto}
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 border-t border-slate-800 space-y-3">
          {error && (
            <p className="text-red-400 text-sm bg-red-950/30 border border-red-900 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {!impresora && (
            <p className="text-amber-400 text-xs text-center">
              No hay impresora configurada. Configurala en Ajustes.
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
              disabled={!impresora || imprimiendo || impreso}
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
