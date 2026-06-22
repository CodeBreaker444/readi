"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/components/useTheme";

interface DroneMapSkeletonProps {
  height?: string;
}

export default function DroneMapSkeleton({ height = "480px" }: DroneMapSkeletonProps) {
  const { isDark } = useTheme();
  const tileClass = isDark ? "bg-slate-600/30" : "bg-slate-300/40";

  return (
    <div
      className={`relative w-full overflow-hidden rounded-lg border ${isDark ? "border-slate-700 bg-slate-800/60" : "border-slate-200 bg-slate-100"}`}
      style={{ height }}
    >
      <div className="absolute inset-0 grid grid-cols-4 grid-rows-3 gap-1 p-1">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className={`h-full w-full rounded-sm ${tileClass}`} />
        ))}
      </div>

      <Skeleton className="absolute top-[28%] left-[22%] h-7 w-7 rounded-full" />
      <Skeleton className="absolute top-[45%] left-[52%] h-7 w-7 rounded-full" />
      <Skeleton className="absolute top-[62%] left-[68%] h-7 w-7 rounded-full" />
      <Skeleton className="absolute top-[35%] left-[78%] h-8 w-8 rounded-md" />

      <div className="absolute top-3 left-3 flex flex-col gap-1">
        <Skeleton className="h-7 w-7 rounded" />
        <Skeleton className="h-7 w-7 rounded" />
      </div>

      <div className={`absolute top-3 right-3 rounded-md border px-2 py-1.5 ${isDark ? "border-slate-600 bg-slate-800/80" : "border-slate-200 bg-white/80"}`}>
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}
