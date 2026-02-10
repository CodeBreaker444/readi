
export default function DashboardSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 lg:mb-8">
        <div className="h-8 w-48 bg-gray-200 dark:bg-slate-700 rounded animate-pulse"></div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-6 lg:mb-8">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm p-4 sm:p-6"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="h-4 w-24 bg-gray-200 dark:bg-slate-700 rounded animate-pulse"></div>
              <div className="h-10 w-10 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
            </div>
            <div className="h-8 w-16 bg-gray-200 dark:bg-slate-700 rounded animate-pulse mt-2"></div>
          </div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 lg:mb-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm p-4 sm:p-6">
          <div className="h-6 w-32 bg-gray-200 dark:bg-slate-700 rounded animate-pulse mb-4"></div>
          <div className="h-64 sm:h-80 bg-gray-100 dark:bg-slate-700 rounded-lg animate-pulse"></div>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm p-4 sm:p-6">
          <div className="h-6 w-32 bg-gray-200 dark:bg-slate-700 rounded animate-pulse mb-4"></div>
          <div className="h-48 bg-gray-100 dark:bg-slate-700 rounded-lg animate-pulse"></div>
        </div>
      </div>

      {/* Tables skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm p-4 sm:p-6"
          >
            <div className="h-6 w-40 bg-gray-200 dark:bg-slate-700 rounded animate-pulse mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, j) => (
                <div key={j} className="flex items-center space-x-4">
                  <div className="h-4 w-16 bg-gray-200 dark:bg-slate-700 rounded animate-pulse"></div>
                  <div className="h-4 w-32 bg-gray-200 dark:bg-slate-700 rounded animate-pulse flex-1"></div>
                  <div className="h-4 w-20 bg-gray-200 dark:bg-slate-700 rounded animate-pulse"></div>
                  <div className="h-6 w-20 bg-gray-200 dark:bg-slate-700 rounded-full animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}