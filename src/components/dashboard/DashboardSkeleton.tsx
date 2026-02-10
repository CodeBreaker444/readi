export default function DashboardSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <div className={`p-4 sm:p-6 lg:p-8 ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <div className="mb-6 lg:mb-8">
        <div
          className={`h-8 w-48 rounded animate-pulse ${
            isDark ? 'bg-slate-700' : 'bg-gray-200'
          }`}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-6 lg:mb-8">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`rounded-lg shadow-sm p-4 sm:p-6 border ${
              isDark
                ? 'bg-slate-800 border-slate-700'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className={`h-4 w-24 rounded animate-pulse ${
                  isDark ? 'bg-slate-700' : 'bg-gray-200'
                }`}
              />
              <div
                className={`h-10 w-10 rounded-lg animate-pulse ${
                  isDark ? 'bg-slate-700' : 'bg-gray-200'
                }`}
              />
            </div>
            <div
              className={`h-8 w-16 rounded animate-pulse mt-2 ${
                isDark ? 'bg-slate-700' : 'bg-gray-200'
              }`}
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 lg:mb-8">
        <div
          className={`lg:col-span-2 rounded-lg shadow-sm p-4 sm:p-6 border ${
            isDark
              ? 'bg-slate-800 border-slate-700'
              : 'bg-white border-gray-200'
          }`}
        >
          <div
            className={`h-6 w-32 rounded animate-pulse mb-4 ${
              isDark ? 'bg-slate-700' : 'bg-gray-200'
            }`}
          />
          <div
            className={`h-64 sm:h-80 rounded-lg animate-pulse ${
              isDark ? 'bg-slate-700' : 'bg-gray-100'
            }`}
          />
        </div>

        <div
          className={`rounded-lg shadow-sm p-4 sm:p-6 border ${
            isDark
              ? 'bg-slate-800 border-slate-700'
              : 'bg-white border-gray-200'
          }`}
        >
          <div
            className={`h-6 w-32 rounded animate-pulse mb-4 ${
              isDark ? 'bg-slate-700' : 'bg-gray-200'
            }`}
          />
          <div
            className={`h-48 rounded-lg animate-pulse ${
              isDark ? 'bg-slate-700' : 'bg-gray-100'
            }`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className={`rounded-lg shadow-sm p-4 sm:p-6 border ${
              isDark
                ? 'bg-slate-800 border-slate-700'
                : 'bg-white border-gray-200'
            }`}
          >
            <div
              className={`h-6 w-40 rounded animate-pulse mb-4 ${
                isDark ? 'bg-slate-700' : 'bg-gray-200'
              }`}
            />

            <div className="space-y-3">
              {[...Array(5)].map((_, j) => (
                <div key={j} className="flex items-center space-x-4">
                  <div
                    className={`h-4 w-16 rounded animate-pulse ${
                      isDark ? 'bg-slate-700' : 'bg-gray-200'
                    }`}
                  />
                  <div
                    className={`h-4 w-32 rounded animate-pulse flex-1 ${
                      isDark ? 'bg-slate-700' : 'bg-gray-200'
                    }`}
                  />
                  <div
                    className={`h-4 w-20 rounded animate-pulse ${
                      isDark ? 'bg-slate-700' : 'bg-gray-200'
                    }`}
                  />
                  <div
                    className={`h-6 w-20 rounded-full animate-pulse ${
                      isDark ? 'bg-slate-700' : 'bg-gray-200'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
