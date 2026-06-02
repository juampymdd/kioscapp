import Skeleton, { KpiSkeleton, PageHeaderSkeleton } from '../../_components/Skeleton'

export default function Loading() {
  return (
    <div>
      <PageHeaderSkeleton />

      {/* KPIs (3) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 3 }).map((_, i) => <KpiSkeleton key={i} />)}
      </div>

      {/* Tabs + grid de cajas */}
      <Skeleton className="h-9 w-64 mb-5 rounded-xl" />
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex justify-between mb-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-6 w-28" />
          </div>
        ))}
      </div>
    </div>
  )
}
