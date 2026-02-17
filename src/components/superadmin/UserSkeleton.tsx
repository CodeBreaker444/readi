export function SkeletonRow({ isDark }: { isDark: boolean }) {
  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className={`shrink-0 h-10 w-10 rounded-full ${isDark ? 'bg-slate-600' : 'bg-gray-200'} animate-pulse`} />
          <div className="ml-4">
            <div className={`h-4 w-28 rounded ${isDark ? 'bg-slate-600' : 'bg-gray-200'} animate-pulse`} />
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className={`h-4 w-20 rounded ${isDark ? 'bg-slate-600' : 'bg-gray-200'} animate-pulse`} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className={`h-4 w-40 rounded ${isDark ? 'bg-slate-600' : 'bg-gray-200'} animate-pulse`} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className={`h-5 w-14 rounded-full ${isDark ? 'bg-slate-600' : 'bg-gray-200'} animate-pulse`} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className={`h-4 w-28 rounded ${isDark ? 'bg-slate-600' : 'bg-gray-200'} animate-pulse`} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className={`h-5 w-16 rounded-full ${isDark ? 'bg-slate-600' : 'bg-gray-200'} animate-pulse`} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className={`h-5 w-16 rounded-full ${isDark ? 'bg-slate-600' : 'bg-gray-200'} animate-pulse`} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex gap-2">
          <div className={`h-8 w-8 rounded ${isDark ? 'bg-slate-600' : 'bg-gray-200'} animate-pulse`} />
          <div className={`h-8 w-8 rounded ${isDark ? 'bg-slate-600' : 'bg-gray-200'} animate-pulse`} />
        </div>
      </td>
    </tr>
  );
}

export function StatSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <div className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-4`}>
      <div className={`h-4 w-20 rounded ${isDark ? 'bg-slate-600' : 'bg-gray-200'} animate-pulse`} />
      <div className={`h-8 w-12 rounded ${isDark ? 'bg-slate-600' : 'bg-gray-200'} animate-pulse mt-2`} />
    </div>
  );
}