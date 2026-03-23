import { Skeleton } from "@/components/ui/skeleton";

export const EvaluationDetailSkeleton = () => {
  return (
    <div className="min-h-screen bg-slate-50/60">
      <div className="border-b border-slate-200 bg-white py-3 top-0 z-10">
        <div className="mx-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-1 h-6 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
          <Skeleton className="h-8 w-32" />
        </div>
      </div>

      <div className="m-4">
        <Skeleton className="h-4 w-48" />
      </div>

      <div className="px-6 py-6 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="border border-slate-200 rounded-xl bg-white p-6 space-y-4">
            <Skeleton className="h-6 w-1/3" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl bg-white p-6 space-y-4">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-[30vh] w-full rounded-md" />
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl bg-white p-6 space-y-4">
          <Skeleton className="h-6 w-1/4" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}