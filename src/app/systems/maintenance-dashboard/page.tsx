"use client";

import MaintenanceTable from "@/components/system/MaintenanceTable";
import { MaintenanceTableSkeleton } from "@/components/tables/MaintenanceTableSkeleton";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/useTheme";
import { MaintenanceDrone } from "@/config/types/maintenance";
import axios from "axios";
import { Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";


export default function MaintenancePage() {
  const { isDark } = useTheme()
  const [data, setData] = useState<MaintenanceDrone[]>([]);
  const [loading, setLoading] = useState(false);
  const hasFetched = useRef(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.post("/api/system/maintenance/dashboard", {
        threshold_alert: 80,
      });
      const json = res.data;
      if (json.code === 1) {
        setData(json.data ?? []);
      } else {
        toast.error(json.message ?? "Failed to load data");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchData();
    }
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
       <div
  className={` top-0 z-10 backdrop-blur-md transition-colors ${
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
          Maintenance Dashboard
        </h1>
        <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
          Drone systems & component maintenance status
        </p>
      </div>
    </div>

    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={fetchData}
        disabled={loading}
        className={`h-8 gap-1.5 text-xs transition-all ${
          isDark
            ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        }`}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
        <span>{loading ? "Loading..." : "Refresh"}</span>
      </Button>
    </div>
  </div>
</div>
      </div>

      <main className=" mx-auto px-4 sm:px-6 py-4">
        {loading && !data.length ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-slate-200 px-4 py-3 h-16 animate-pulse"
                />
              ))}
            </div>
            <MaintenanceTableSkeleton />
          </>
        ) : (
          <MaintenanceTable data={data} />
        )}
      </main>
    </div>
  );
}