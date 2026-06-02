import type { CSSProperties } from 'react'

/**
 * Bloque de carga (shimmer) por capas tonales. Plano, sin sombra (DESIGN.md).
 * Respeta prefers-reduced-motion: sin pulso si el usuario lo pidió.
 */
export default function Skeleton({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      aria-hidden="true"
      style={style}
      className={`animate-pulse motion-reduce:animate-none bg-slate-800 rounded ${className}`}
    />
  )
}
