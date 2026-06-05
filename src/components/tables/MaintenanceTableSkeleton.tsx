import { useTheme } from "@/components/useTheme";

export const MaintenanceTableSkeleton = () => {
  const { isDark } = useTheme();

  return (
    <div className={`rounded-xl border overflow-hidden ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className={`flex items-center gap-4 px-4 py-3.5 ${
            i !== 0 ? `border-t ${isDark ? "border-slate-700" : "border-slate-100"}` : ""
          }`}
        >
          <div
            className={`h-3 rounded-full animate-pulse ${isDark ? "bg-slate-600" : "bg-slate-200"} ${
              i % 3 === 0 ? "w-32" : i % 3 === 1 ? "w-24" : "w-28"
            }`}
          />
          <div className={`h-3 w-20 rounded-full animate-pulse ${isDark ? "bg-slate-700" : "bg-slate-100"}`} />
          <div className={`h-3 w-16 rounded-full animate-pulse ml-auto ${isDark ? "bg-slate-700" : "bg-slate-100"}`} />
          <div className={`h-5 w-14 rounded-md animate-pulse ${isDark ? "bg-slate-700" : "bg-slate-100"}`} />
        </div>
      ))}
    </div>
  );
}