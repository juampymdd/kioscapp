/**
 * Bloque de carga (shimmer). Plano, capas tonales slate. Respeta reduced-motion.
 * Espejo del Skeleton del desktop para mantener identidad en ambos lados.
 */
import type { CSSProperties } from 'react'

export default function Skeleton({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      aria-hidden="true"
      style={style}
      className={`animate-pulse motion-reduce:animate-none bg-slate-800 rounded-lg ${className}`}
    />
  )
}

/** Tarjeta KPI placeholder (igual forma que el Kpi real). */
export function KpiSkeleton() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <Skeleton className="h-3 w-20 mb-2.5" />
      <Skeleton className="h-7 w-28" />
    </div>
  )
}

/** Encabezado de página placeholder (igual forma que PageHeader). */
export function PageHeaderSkeleton() {
  return (
    <div className="mb-8 flex items-center gap-3">
      <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
      <div>
        <Skeleton className="h-7 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
    </div>
  )
}
