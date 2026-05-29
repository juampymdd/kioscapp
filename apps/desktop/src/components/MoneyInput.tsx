import { useEffect, useRef } from 'react'
import { formatCentavos } from '../lib/money'

interface Props {
  centavos: number
  onChange: (centavos: number) => void
  className?: string
  autoFocus?: boolean
}

export default function MoneyInput({ centavos, onChange, className = '', autoFocus }: Props) {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => ref.current?.focus(), 150)
      return () => clearTimeout(t)
    }
  }, [autoFocus])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault()
      const next = centavos * 10 + parseInt(e.key)
      if (next <= 99_999_999_99) onChange(next) // máx $999.999.999,99
    } else if (e.key === 'Backspace') {
      e.preventDefault()
      onChange(Math.floor(centavos / 10))
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onChange(0)
    }
  }

  return (
    <input
      ref={ref}
      type="text"
      readOnly
      value={formatCentavos(centavos)}
      onKeyDown={handleKeyDown}
      className={`cursor-text select-none ${className}`}
    />
  )
}
