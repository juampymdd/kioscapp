import { useRef, useEffect, useState } from 'react'
import type { Producto } from '@kioscapp/shared'
import { getDataStore } from '../store/dataStore'
import { useCartStore } from '../store/cartStore'

interface Props {
  onProductoEncontrado?: (p: Producto) => void
}

export default function BarcodeInput({ onProductoEncontrado }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')
  const [searching, setSearching] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const addItem = useCartStore(s => s.addItem)

  // Mantener el foco siempre en el input (scanner de código de barras)
  useEffect(() => {
    const handleClick = () => inputRef.current?.focus()
    document.addEventListener('click', handleClick)
    inputRef.current?.focus()
    return () => document.removeEventListener('click', handleClick)
  }, [])

  async function buscar(barcode: string) {
    if (!barcode.trim()) return
    setSearching(true)
    setNotFound(false)
    try {
      const producto = await getDataStore().getProductoPorBarcode(barcode.trim())
      if (producto) {
        addItem(producto)
        onProductoEncontrado?.(producto)
        setValue('')
      } else {
        setNotFound(true)
        setTimeout(() => setNotFound(false), 2000)
      }
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
            🔍
          </span>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') buscar(value)
            }}
            placeholder="Escanear código o buscar…"
            className={`w-full bg-slate-800 border rounded-xl pl-10 pr-4 py-3 text-white
                        placeholder-slate-500 focus:outline-none focus:ring-2
                        ${notFound
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-slate-600 focus:ring-blue-500'
                        }`}
          />
        </div>
        <button
          onClick={() => buscar(value)}
          disabled={searching}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-xl
                     font-medium transition-colors cursor-pointer disabled:opacity-50"
        >
          {searching ? '…' : 'OK'}
        </button>
      </div>
      {notFound && (
        <p className="text-red-400 text-xs mt-1 ml-1">Producto no encontrado</p>
      )}
    </div>
  )
}
