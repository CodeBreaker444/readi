import { useTheme } from "@/components/useTheme";

// Mirrors MaintenanceTable: filter bar, header row, one page (8) of rows across 10 columns, pagination footer.
const PAGE_SIZE = 8;
const COLUMN_WIDTHS = ["w-28", "w-20", "w-24", "w-16", "w-20", "w-20", "w-20", "w-20", "w-20", "w-16"];

export const MaintenanceTableSkeleton = () => {
  const { isDark } = useTheme();
  const bar = isDark ? "bg-slate-700" : "bg-slate-100";
  const barStrong = isDark ? "bg-slate-600" : "bg-slate-200";
  const divider = isDark ? "border-slate-700" : "border-slate-200";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className={`h-9.5 w-85 rounded-lg border animate-pulse ${divider} ${bar}`} />
        <div className={`h-9.5 flex-1 min-w-50 rounded-lg border animate-pulse ${divider} ${bar}`} />
        <div className={`h-11 w-80 rounded-xl border animate-pulse ${divider} ${bar}`} />
      </div>

      <div className={`rounded-xl border overflow-hidden ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
        <div className={`flex items-center gap-4 px-3 h-10 border-b ${divider} ${isDark ? "bg-slate-900" : "bg-slate-50"}`}>
          {COLUMN_WIDTHS.map((w, i) => (
            <div key={i} className={`h-2.5 rounded-full animate-pulse flex-1 max-w-24 ${barStrong}`} />
          ))}
        </div>

        {[...Array(PAGE_SIZE)].map((_, i) => (
          <div key={i} className={`flex items-center gap-4 px-3 h-18.25 border-t ${divider}`}>
            {COLUMN_WIDTHS.map((w, j) => (
              <div key={j} className="flex-1 max-w-24">
                <div className={`h-3 rounded-full animate-pulse ${w} max-w-full ${j === 0 ? barStrong : bar}`} />
              </div>
            ))}
          </div>
        ))}

        <div className={`border-t px-2 h-13 flex items-center justify-between ${divider}`}>
          <div className={`h-6 w-40 rounded-md animate-pulse ${bar}`} />
          <div className={`h-6 w-52 rounded-md animate-pulse ${bar}`} />
        </div>
      </div>
    </div>
  );
};
