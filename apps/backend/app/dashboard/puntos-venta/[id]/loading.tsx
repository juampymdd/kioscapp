import Skeleton, { KpiSkeleton, PageHeaderSkeleton } from '../../_components/Skeleton'

export default function Loading() {
  return (
    <div>
      <PageHeaderSkeleton />

      {/* KPIs (3) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 3 }).map((_, i) => <KpiSkeleton key={i} />)}
      </div>

      {/* Tabs + tabla de últimas ventas */}
      <Skeleton className="h-9 w-72 mb-5 rounded-xl" />
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="divide-y divide-slate-800/50">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
