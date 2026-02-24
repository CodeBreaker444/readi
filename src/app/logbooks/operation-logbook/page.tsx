"use client";

import { OperationFilterPanel } from "@/components/logbook/OperationFilterPanel";
import { OperationLogbookTable } from "@/components/logbook/OperationLogbookTable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/components/useTheme";
import {
  ClientOption,
  DroneOption,
  MissionCategoryOption,
  MissionPlanOption,
  MissionResultOption,
  MissionStatusOption,
  MissionTypeOption,
  OperationFilterParams,
  OperationLogbookItem,
  PilotOption,
} from "@/config/types/logbook";
import axios from "axios";
import { Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface FiltersState {
  pilots: PilotOption[];
  clients: ClientOption[];
  drones: DroneOption[];
  missionTypes: MissionTypeOption[];
  missionCategories: MissionCategoryOption[];
  missionResults: MissionResultOption[];
  missionStatuses: MissionStatusOption[];
  missionPlans: MissionPlanOption[];
}

export default function OperationLogbookPage() {
  const { isDark } = useTheme();
  const [data, setData] = useState<OperationLogbookItem[]>([]);
  const [filters, setFilters] = useState<FiltersState>({
    pilots: [],
    clients: [],
    drones: [],
    missionTypes: [],
    missionCategories: [],
    missionResults: [],
    missionStatuses: [],
    missionPlans: [],
  });
  const [loading, setLoading] = useState(false);
  const [filtersLoading, setFiltersLoading] = useState(false);


  const fetchFilters =  useCallback(async () => {
    setFiltersLoading(true);
    try {
      const res = await axios.post("/api/logbooks/operation/filter", {});
      const json = res.data;
      console.log('fileter:',json);
      
      if (json.code === 200) {
        setFilters({
          pilots: json.pilots?.data ?? [],
          clients: json.clients?.data ?? [],
          drones: json.drones?.data ?? [],
          missionTypes: json.missionTypes?.data ?? [],
          missionCategories: json.missionCategories?.data ?? [],
          missionResults: json.missionResults?.data ?? [],
          missionStatuses: json.missionStatuses?.data ?? [],
          missionPlans: json.missionPlans?.data ?? [],
        });
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load filters");
    } finally {
      setFiltersLoading(false);
    }
  },[]);


  const fetchData = useCallback(async(params: Partial<OperationFilterParams>) => {
    setLoading(true);
    try {
      const res = await axios.post("/api/logbooks/operation/list", params);
      const json = res.data;
      if (json.code === 200) {
        setData(json.data ?? []);
      } else {
        toast.error(json.message ?? "Failed to load data");
        setData([]);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Network error");
      setData([]);
    } finally {
      setLoading(false);
    }
  },[]);

  useEffect(() => {
    fetchFilters();
    fetchData({});
  }, [fetchFilters, fetchData]);


 return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDark ? "bg-slate-950 text-white" : "bg-slate-50 text-gray-900"
      } font-sans`}
    >
      <div
        className={`top-0 z-10 backdrop-blur-md transition-colors ${
          isDark
            ? "bg-slate-900/80 border-b border-slate-800 text-white"
            : "bg-white/80 border-b border-slate-200 text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
        } px-6 py-4`}
      >
        <div className="mx-auto max-w-[1800px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1
                className={`text-sm font-bold tracking-tight ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                Operation Flight Logbook
              </h1>
              <p className={`text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                Browse, filter and analyse flight mission records
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData({})}
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
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1800px] space-y-4 px-6 py-5">
        {filtersLoading ? (
           <div
      className={`rounded-xl border p-5 ${
        isDark
          ? "border-slate-800 bg-slate-900/60"
          : "border-slate-200 bg-white shadow-sm"
      }`}
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className={`h-2.5 w-16 ${isDark ? "bg-slate-800" : "bg-slate-100"}`} />
            <Skeleton className={`h-8 w-full ${isDark ? "bg-slate-800" : "bg-slate-100"}`} />
          </div>
        ))}
      </div>
      <div
        className={`mt-5 pt-4 border-t flex gap-2 ${
          isDark ? "border-slate-800" : "border-slate-200"
        }`}
      >
        <Skeleton className={`h-8 w-24 ${isDark ? "bg-slate-800" : "bg-slate-100"}`} />
        <Skeleton className={`h-8 w-20 ${isDark ? "bg-slate-800" : "bg-slate-100"}`} />
      </div>
    </div>
        ) : (
          <OperationFilterPanel
            pilots={filters.pilots}
            clients={filters.clients}
            drones={filters.drones}
            missionTypes={filters.missionTypes}
            missionCategories={filters.missionCategories}
            missionResults={filters.missionResults}
            missionStatuses={filters.missionStatuses}
            missionPlans={filters.missionPlans}
            loading={loading}
            onSearch={(params) => fetchData(params)}
            isDark={isDark}
          />
        )}

        <OperationLogbookTable data={data} loading={loading} isDark={isDark} />
      </div>
    </div>
  );
}