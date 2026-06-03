'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Trash2, X } from 'lucide-react'

type Tono = 'peligro' | 'normal'
export type ConfirmOpts = {
  titulo: string
  mensaje?: string
  confirmar?: string
  cancelar?: string
  tono?: Tono
}

type Pendiente = ConfirmOpts & { resolve: (v: boolean) => void }

const ConfirmCtx = createContext<(o: ConfirmOpts) => Promise<boolean>>(async () => false)

/** Hook: `const confirm = useConfirm(); if (await confirm({...})) {...}` */
export function useConfirm() {
  return useContext(ConfirmCtx)
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pend, setPend] = useState<Pendiente | null>(null)
  const okRef = useRef<HTMLButtonElement>(null)

  const confirm = useCallback((o: ConfirmOpts) =>
    new Promise<boolean>(resolve => setPend({ ...o, resolve })), [])

  const cerrar = useCallback((v: boolean) => {
    setPend(p => { p?.resolve(v); return null })
  }, [])

  useEffect(() => {
    if (!pend) return
    okRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar(false)
      if (e.key === 'Enter') cerrar(true)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [pend, cerrar])

  const peligro = pend?.tono !== 'normal'

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {pend && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 confirm-backdrop"
          onClick={() => cerrar(false)}>
          <div role="alertdialog" aria-modal="true" aria-label={pend.titulo}
            onClick={e => e.stopPropagation()}
            className="confirm-card w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 flex gap-4">
              <span className={`shrink-0 grid place-items-center w-11 h-11 rounded-full
                ${peligro ? 'bg-red-500/15 text-red-400' : 'bg-blue-500/15 text-blue-400'}`}>
                {peligro ? <AlertTriangle size={20} /> : <Trash2 size={20} />}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-slate-50 leading-tight text-pretty">{pend.titulo}</h2>
                {pend.mensaje && <p className="mt-1.5 text-sm text-slate-400 leading-snug">{pend.mensaje}</p>}
              </div>
              <button onClick={() => cerrar(false)} aria-label="Cerrar"
                className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4 bg-slate-950/40 border-t border-slate-800 flex gap-2 justify-end">
              <button onClick={() => cerrar(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors">
                {pend.cancelar ?? 'Cancelar'}
              </button>
              <button ref={okRef} onClick={() => cerrar(true)}
                className={`px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900
                  ${peligro ? 'bg-red-600 hover:bg-red-500 focus:ring-red-500' : 'bg-blue-600 hover:bg-blue-500 focus:ring-blue-500'}`}>
                {pend.confirmar ?? 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  )
}
