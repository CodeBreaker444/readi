export const MaintenanceTableSkeleton = () => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className={`flex items-center gap-4 px-4 py-3.5 ${
            i !== 0 ? "border-t border-slate-100" : ""
          }`}
        >
          <div
            className={`h-3 rounded-full bg-slate-200 animate-pulse ${
              i % 3 === 0 ? "w-32" : i % 3 === 1 ? "w-24" : "w-28"
            }`}
          />
          <div className="h-3 w-20 rounded-full bg-slate-100 animate-pulse" />
          <div className="h-3 w-16 rounded-full bg-slate-100 animate-pulse ml-auto" />
          <div className="h-5 w-14 rounded-md bg-slate-100 animate-pulse" />
        </div>
      ))}
    </div>
  );
}