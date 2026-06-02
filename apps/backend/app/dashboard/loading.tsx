import Skeleton, { KpiSkeleton, PageHeaderSkeleton } from './_components/Skeleton'

export default function Loading() {
  return (
    <div>
      <PageHeaderSkeleton />

      {/* KPIs (5) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />)}
      </div>

      {/* Gráfico */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <Skeleton className="h-4 w-40 mb-1.5" />
        <Skeleton className="h-3 w-56 mb-5" />
        <div className="flex items-end gap-2 h-56">
          {Array.from({ length: 14 }).map((_, i) => (
            <Skeleton key={i} className="flex-1" style={{ height: `${25 + (i * 13) % 70}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}
