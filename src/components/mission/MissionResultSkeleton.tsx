interface MissionResultSkeletonProps {
  isDark: boolean;
}

export default function MissionResultSkeleton({ isDark }: MissionResultSkeletonProps) {
  return (
    <div className={`overflow-hidden ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="w-full animate-pulse">
          <div className={`overflow-x-auto rounded-xl border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
            <table className="w-full">
              <thead className={isDark ? 'bg-slate-700' : 'bg-linear-to-r from-blue-50 to-indigo-50'}>
                <tr>
                  {[1, 2, 3, 4].map((i) => (
                    <th key={i} className="px-6 py-4">
                      <div className={`h-4 rounded ${isDark ? 'bg-slate-600' : 'bg-gray-300'}`} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={isDark ? 'divide-y divide-slate-700' : 'divide-y divide-gray-100'}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((row) => (
                  <tr key={row}>
                    {[1, 2, 3, 4].map((col) => (
                      <td key={col} className="px-6 py-4">
                        <div className={`h-4 rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={`mt-4 flex items-center justify-between px-4 py-3 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
            <div className={`h-4 w-48 rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
            <div className="flex items-center gap-2">
              <div className={`h-9 w-9 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
              <div className={`h-9 w-9 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
              <div className={`h-9 w-9 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
              <div className={`h-9 w-9 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}