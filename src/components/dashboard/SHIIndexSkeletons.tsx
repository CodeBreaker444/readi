import { cn } from "@/lib/utils";
import { Skeleton } from "../ui/skeleton";

export function GaugeSkeleton({ isDark }: { isDark: boolean }) {
  const card    = isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200';
  const divider = isDark ? 'border-slate-700/60 divide-slate-700/60' : 'border-gray-100 divide-gray-100';
  return (
    <div className={cn('rounded-xl border h-full flex flex-col', card)}>
      <div className={cn('px-5 py-4 border-b flex items-start justify-between', divider)}>
        <div className="space-y-1.5">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className={cn('grid grid-cols-2 divide-x border-b', divider)}>
        <div className="px-5 py-4 space-y-2">
          <Skeleton className="h-2.5 w-14" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="px-5 py-4 space-y-2">
          <Skeleton className="h-2.5 w-14" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center px-6 py-6">
        <Skeleton className="w-44 h-28 rounded-full" />
      </div>
      <div className={cn('px-5 py-4 border-t space-y-3', divider)}>
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-3.5 w-full" />)}
      </div>
    </div>
  );
}

export function TrendChartSkeleton({ isDark }: { isDark: boolean }) {
  const card    = isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200';
  const divider = isDark ? 'border-slate-700/60 divide-slate-700/60' : 'border-gray-100 divide-gray-100';
  return (
    <div className={cn('rounded-xl border h-full flex flex-col', card)}>
      <div className={cn('px-5 py-4 border-b flex items-start justify-between gap-4', divider)}>
        <div className="space-y-1.5">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-4 w-44" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full shrink-0" />
      </div>
      <div className={cn('grid grid-cols-4 divide-x', divider)}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="px-4 py-3 space-y-2">
            <Skeleton className="h-2.5 w-12" />
            <Skeleton className="h-5 w-14" />
          </div>
        ))}
      </div>
      <div className={cn('px-5 py-2.5 border-t flex items-center gap-4', divider)}>
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-3 w-16" />)}
      </div>
      <div className="flex-1 px-3 pb-3 pt-2">
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function AreaGaugesSkeleton({ isDark }: { isDark: boolean }) {
  const card    = isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200';
  const inner   = isDark ? 'bg-slate-700/40 border-slate-700/60' : 'bg-gray-50 border-gray-100';
  const divider = isDark ? 'border-slate-700/60' : 'border-gray-100';
  return (
    <div className={cn('rounded-xl border', card)}>
      <div className={cn('px-5 py-4 border-b flex items-center justify-between', divider)}>
        <div className="space-y-1.5">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="hidden sm:flex items-center gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-3 w-14" />)}
        </div>
      </div>
      <div className="p-5 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={cn('rounded-xl border p-4 flex flex-col items-center gap-3', inner)}>
            <Skeleton className="h-3 w-24 self-start" />
            <Skeleton className="w-32.5 h-22 rounded-lg" />
            <Skeleton className="h-6 w-14" />
            <Skeleton className="h-1.5 w-full rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function IndicatorCardsSkeleton({ isDark }: { isDark: boolean }) {
  const card    = isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200';
  const inner   = isDark ? 'bg-slate-700/30 divide-slate-700' : 'bg-gray-50 divide-gray-100';
  const divider = isDark ? 'bg-slate-700/60' : 'bg-gray-200';
  return (
    <div className="space-y-6">
      {[1, 2].map(area => (
        <div key={area}>
          <div className="flex items-center gap-3 mb-4">
            <div className={cn('h-px flex-1', divider)} />
            <Skeleton className="h-5 w-24 rounded-full" />
            <div className={cn('h-px flex-1', divider)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={cn('rounded-xl border flex flex-col overflow-hidden', card)}>
                <Skeleton className="h-0.5 w-full rounded-none" />
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <Skeleton className="h-3.5 flex-1" />
                    <Skeleton className="h-5 w-14 rounded-full shrink-0" />
                  </div>
                  <div className="flex justify-center">
                    <Skeleton className="w-27.5 h-18.5 rounded-lg" />
                  </div>
                  <div className={cn('grid grid-cols-2 divide-x rounded-lg overflow-hidden', inner)}>
                    <div className="px-3 py-2 space-y-1.5">
                      <Skeleton className="h-2 w-10" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                    <div className="px-3 py-2 space-y-1.5">
                      <Skeleton className="h-2 w-10" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <Skeleton className="h-2.5 w-14" />
                      <Skeleton className="h-2.5 w-8" />
                    </div>
                    <Skeleton className="h-1.5 w-full rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function IndicatorTrendSkeleton({ isDark }: { isDark: boolean }) {
  const card    = isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200';
  const divider = isDark ? 'border-slate-700/60 divide-slate-700/60' : 'border-gray-100 divide-gray-100';
  return (
    <div className={cn('rounded-xl border', card)}>
      <div className={cn('px-5 py-4 border-b flex items-start justify-between gap-4', divider)}>
        <div className="space-y-1.5">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-8 w-48 rounded-lg shrink-0" />
      </div>
      <div className="p-5">
        <div className={cn('rounded-xl border flex flex-col', card)}>
          <div className={cn('px-5 py-4 border-b flex items-start justify-between gap-4', divider)}>
            <div className="space-y-1.5">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full shrink-0" />
          </div>
          <div className={cn('grid grid-cols-3 divide-x', divider)}>
            {[1, 2, 3].map(i => (
              <div key={i} className="px-5 py-3 space-y-1.5">
                <Skeleton className="h-2.5 w-12" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
          <div className={cn('px-5 py-3 border-t space-y-2', divider)}>
            <div className="flex justify-between">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-2.5 w-8" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
          <div className="px-3 pb-4 pt-2">
            <div className="flex items-center gap-4 px-3 mb-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-52 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}