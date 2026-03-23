interface MissionStatusSkeletonProps {
  isDark: boolean;
}

export default function MissionStatusSkeleton({ isDark }: MissionStatusSkeletonProps) {
  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0a0e1a]' : 'bg-[#f4f6f9]'}`}>
      {/* Top Bar Skeleton */}
      <div className={`top-0 z-20 backdrop-blur-xl border-b ${
        isDark ? 'bg-[#0a0e1a]/90 border-white/[0.06]' : 'bg-white/80 border-black/[0.06]'
      }`}>
        <div className="mx-auto max-w-[1600px] px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="space-y-1.5">
              <div className={`h-4 w-32 rounded animate-pulse ${isDark ? 'bg-white/[0.06]' : 'bg-gray-200'}`} />
              <div className={`h-2.5 w-44 rounded animate-pulse ${isDark ? 'bg-white/[0.04]' : 'bg-gray-100'}`} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg animate-pulse ${isDark ? 'bg-white/[0.06]' : 'bg-gray-200'}`} />
            <div className={`w-24 h-8 rounded-lg animate-pulse ${isDark ? 'bg-white/[0.08]' : 'bg-gray-200'}`} />
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="mx-auto max-w-[1600px] px-6 py-6">
        <div className={`rounded-xl border overflow-hidden ${
          isDark
            ? 'bg-[#0f1320] border-white/[0.06]'
            : 'bg-white border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
        }`}>
          {/* Section Header Skeleton */}
          <div className={`px-5 py-4 border-b ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
            <div className={`h-4 w-36 rounded animate-pulse ${isDark ? 'bg-white/[0.06]' : 'bg-gray-200'}`} />
            <div className={`h-2.5 w-56 rounded animate-pulse mt-2 ${isDark ? 'bg-white/[0.04]' : 'bg-gray-100'}`} />
          </div>

          {/* Table Skeleton */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                  {[40, 80, 120, 180, 60, 60, 80].map((w, i) => (
                    <th key={i} className={`h-10 px-5 ${isDark ? 'bg-white/[0.02]' : 'bg-gray-50/60'}`}>
                      <div
                        className={`h-2.5 rounded animate-pulse ${isDark ? 'bg-white/[0.06]' : 'bg-gray-200/80'}`}
                        style={{ width: `${w}px` }}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }).map((_, row) => (
                  <tr
                    key={row}
                    className={`border-b ${isDark ? 'border-white/[0.04]' : 'border-gray-50'}`}
                    style={{ animationDelay: `${row * 60}ms` }}
                  >
                    {[32, 72, 100, 160, 36, 48, 64].map((w, col) => (
                      <td key={col} className="px-5 py-3">
                        <div
                          className={`h-4 rounded animate-pulse ${
                            col === 6 ? 'ml-auto' : ''
                          } ${isDark ? 'bg-white/[0.04]' : 'bg-gray-100'}`}
                          style={{
                            width: `${w}px`,
                            animationDelay: `${row * 60 + col * 30}ms`,
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Skeleton */}
          <div className={`px-5 py-3 border-t flex items-center justify-between ${
            isDark ? 'border-white/[0.06]' : 'border-gray-100'
          }`}>
            <div className={`h-3 w-36 rounded animate-pulse ${isDark ? 'bg-white/[0.04]' : 'bg-gray-100'}`} />
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-7 w-7 rounded-lg animate-pulse ${isDark ? 'bg-white/[0.04]' : 'bg-gray-100'}`}
                  style={{ animationDelay: `${i * 50}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}