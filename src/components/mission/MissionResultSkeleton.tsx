interface MissionResultSkeletonProps {
  isDark: boolean;
}

export default function MissionResultSkeleton({ isDark }: MissionResultSkeletonProps) {
  return (
    <div className={`rounded-xl sm:rounded-2xl shadow-xl border overflow-hidden ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
      {/* <div className={`px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-b ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
        <div className={`h-5 w-48 rounded-md animate-pulse ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
        <div className={`h-3.5 w-64 rounded-md animate-pulse mt-2 ${isDark ? 'bg-gray-700/60' : 'bg-gray-100'}`} />
      </div> */}
      <div className="p-4 sm:p-6 lg:p-8">
        <div className={`overflow-x-auto rounded-xl border shadow-sm animate-pulse ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <table className="w-full">
            <thead className={isDark ? 'bg-slate-700' : 'bg-gradient-to-r from-blue-50 to-indigo-50'}>
              <tr>
                {[1, 2, 3, 4].map((i) => (
                  <th key={i} className="px-6 py-4">
                    <div className={`h-3.5 rounded ${isDark ? 'bg-slate-600' : 'bg-gray-300'}`} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={isDark ? 'divide-y divide-slate-700' : 'divide-y divide-gray-100'}>
              {Array.from({ length: 8 }).map((_, row) => (
                <tr key={row}>
                  {[1, 2, 3, 4].map((col) => (
                    <td key={col} className="px-6 py-4">
                      <div className={`h-4 rounded ${col === 4 ? 'w-16 ml-auto' : ''} ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={`mt-4 flex items-center justify-between px-4 py-3 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <div className={`h-4 w-48 rounded animate-pulse ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`h-9 w-9 rounded-lg animate-pulse ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}