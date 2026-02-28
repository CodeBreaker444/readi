"use client";

import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
    onRefresh: () => void;
    isRefreshing: boolean;
    isDark: boolean;
}

export function BoardHeader({ onRefresh, isRefreshing, isDark }: Props) {
    const [now, setNow] = useState<Date | null>(null);

    useEffect(() => {
        setNow(new Date());
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    const dateStr = now?.toLocaleDateString("en-GB", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const timeStr = now?.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
    return (
     <div
  className={`sticky top-0 z-10 backdrop-blur-md transition-colors ${
    isDark
      ? "bg-slate-900/80 border-b border-slate-800 text-white"
      : "bg-white/80 border-b border-slate-200 text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
  } px-6 py-4`}
>
  <div className="mx-auto max-w-[1800px] flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="w-1 h-6 rounded-full bg-violet-600" />
      
      <div>
        <h1
          className={`text-lg font-bold tracking-tight ${
            isDark ? "text-white" : "text-slate-900"
          }`}
        >
          Operation Board
        </h1>
        <div className="flex items-center gap-2 mt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <p className={`text-[10px] font-bold uppercase tracking-wider ${
              isDark ? "text-slate-500" : "text-slate-400"
            }`}>
              Live
            </p>
          </div>
          <span className={`text-[10px] ${isDark ? "text-slate-700" : "text-slate-300"}`}>|</span>
          <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            Real-time mission workflow management
          </p>
        </div>
      </div>
    </div>

    <div className="flex items-center gap-4">
      {now && (
        <div className="hidden md:flex items-center gap-2 border-r border-slate-200 dark:border-slate-800 pr-4">
          <span className={`text-[11px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            {now.toLocaleDateString("en-GB", { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
          <span className={`text-[11px] font-mono font-bold ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            {now.toLocaleTimeString("en-GB", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={isRefreshing}
        className={`h-8 gap-1.5 text-xs transition-all ${
          isDark
            ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        }`}
      >
        {isRefreshing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
        Refresh
      </Button>
    </div>
  </div>
</div>
    );
}