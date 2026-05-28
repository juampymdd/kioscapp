import { useRef, useState } from 'react'
import { Scan } from 'lucide-react'
import { getDataStore } from '../store/dataStore'
import { useCartStore } from '../store/cartStore'

interface Props {
  onFiltroChange: (filtro: string) => void
}

export default function SearchInput({ onFiltroChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')
  const [searching, setSearching] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const addItem = useCartStore(s => s.addItem)

  function handleChange(v: string) {
    setValue(v)
    setNotFound(false)
    onFiltroChange(v)
  }

  async function buscarBarcode() {
    if (!value.trim()) return
    setSearching(true)
    setNotFound(false)
    try {
      const producto = await getDataStore().getProductoPorBarcode(value.trim())
      if (producto) {
        addItem(producto)
        setValue('')
        onFiltroChange('')
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
          <Scan
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={value}
            onChange={e => handleChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') buscarBarcode() }}
            placeholder="Escanear código o buscar por nombre…"
            className={`w-full bg-slate-800 border rounded-xl pl-10 pr-4 py-3 text-white
                        placeholder-slate-500 focus:outline-none focus:ring-2
                        ${notFound
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-slate-600 focus:ring-blue-500'
                        }`}
          />
        </div>
        <button
          onClick={buscarBarcode}
          disabled={searching}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-xl
                     font-medium transition-colors cursor-pointer disabled:opacity-50"
        >
          {searching ? '…' : 'OK'}
        </button>
      </div>
      {notFound && (
        <p className="text-red-400 text-xs mt-1 ml-1">Código no encontrado</p>
      )}
    </div>
  )
}
