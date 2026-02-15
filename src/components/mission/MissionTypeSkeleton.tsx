export default function MissionTypeSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
      {/* Table Skeleton */}
      <div className={`rounded-xl sm:rounded-2xl shadow-xl border overflow-hidden ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="h-6 bg-blue-400/30 rounded w-1/3 animate-pulse"></div>
          <div className="h-4 bg-blue-400/20 rounded w-1/2 mt-2 animate-pulse"></div>
        </div>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`h-16 rounded-lg animate-pulse ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}></div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Skeleton */}
      <div className={`rounded-xl sm:rounded-2xl shadow-xl border overflow-hidden ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="h-6 bg-blue-400/30 rounded w-1/3 animate-pulse"></div>
          <div className="h-4 bg-blue-400/20 rounded w-1/2 mt-2 animate-pulse"></div>
        </div>
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className={`h-4 rounded w-1/4 mb-2 animate-pulse ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
              <div className={`h-12 rounded-lg animate-pulse ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}></div>
            </div>
          ))}
          <div className={`h-12 rounded-lg animate-pulse ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}></div>
        </div>
      </div>
    </div>
  );
}