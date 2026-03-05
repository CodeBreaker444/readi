"use client";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  isDark: boolean;
  selectedLabel?: string | null;
  dropdownItems?: { label: string; onClick: () => void }[];
}

export default function PageHeader({
  title,
  subtitle,
  isDark,
  selectedLabel,
  dropdownItems,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "top-0 z-10 backdrop-blur-md transition-colors px-6 py-4",
        isDark
          ? "bg-slate-800 border-b border-slate-700 text-white"
          : "bg-white border-b border-slate-200 text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
      )}
    >
      <div className="mx-auto max-w-[1800px] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 rounded-full bg-violet-600" />
          <div>
            <h1
              className={cn(
                "text-lg font-bold tracking-tight",
                isDark ? "text-white" : "text-slate-900"
              )}
            >
              {title}
            </h1>
            <p className={cn("text-xs", isDark ? "text-slate-500" : "text-slate-400")}>
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {selectedLabel && (
            <span
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-full border max-w-xs truncate",
                isDark
                  ? "border-violet-700 text-violet-300 bg-violet-900/30"
                  : "border-violet-200 text-violet-700 bg-violet-50"
              )}
            >
              {selectedLabel}
            </span>
          )}

          {dropdownItems && dropdownItems.length > 0 && selectedLabel && (
            <div className="relative group">
              <button
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
                  isDark
                    ? "border-slate-600 hover:bg-slate-700 text-slate-300"
                    : "border-slate-300 hover:bg-slate-50 text-slate-600"
                )}
              >
                Actions
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div
                className={cn(
                  "absolute right-0 mt-1 w-44 rounded-lg border shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50",
                  isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                )}
              >
                {dropdownItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    className={cn(
                      "w-full text-left px-4 py-2 text-xs first:rounded-t-lg last:rounded-b-lg transition-colors",
                      isDark ? "hover:bg-slate-700 text-slate-300" : "hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

         
        </div>
      </div>
    </div>
  );
}