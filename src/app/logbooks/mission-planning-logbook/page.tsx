"use client";

import { FilterPanel } from "@/components/logbook/FilterPanel";
import { MissionLogbookTable } from "@/components/logbook/MissionLogbookTable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/components/useTheme";
import { ClientOption, EvaluationOption, FilterParams, MissionPlanningLogbookItem, PilotOption, PlanningOption } from "@/config/types/logbook";
import axios from "axios";
import { Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface FiltersState {
  clients: ClientOption[];
  pilots: PilotOption[];
  evaluations: EvaluationOption[];
  plannings: PlanningOption[];
}

export default function MissionPlanningLogbookPage() {
  const { isDark } = useTheme();
  const [data, setData] = useState<MissionPlanningLogbookItem[]>([]);
  const [filters, setFilters] = useState<FiltersState>({
    clients: [],
    pilots: [],
    evaluations: [],
    plannings: [],
  });
  const [loading, setLoading] = useState(false);
  const [filtersLoading, setFiltersLoading] = useState(false);

  const fetchFilters = useCallback(async () => {
    setFiltersLoading(true);
    try {
      const res = await axios.post("/api/logbooks/mission/filter", {});
      const json = res.data;
      if (json.code === 200) {
        setFilters({
          clients: json.clients?.data ?? [],
          pilots: json.pilots?.data ?? [],
          evaluations: json.evaluations?.data ?? [],
          plannings: json.plannings?.data ?? [],
        });
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load filters");
    } finally {
      setFiltersLoading(false);
    }
  }, []);

  const fetchData = useCallback(async (params: Partial<FilterParams>) => {
    setLoading(true);
    try {
      const res = await axios.post("/api/logbooks/mission/list", { ...params });
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
  }, []);

  useEffect(() => {
    fetchFilters();
    fetchData({});
  }, [fetchFilters, fetchData]);

 return (
  <div className={`min-h-screen transition-colors duration-300 ${
    isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-gray-900'
  } font-sans`}>
    
    <div className={` top-0 z-10   backdrop-blur-md transition-colors ${
      isDark 
        ? 'bg-slate-900/80 border-slate-800 text-white' 
        : 'bg-white/80 border-slate-200 text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
    } px-6 py-5`}>
      <div className="mx-auto max-w-[1600px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full bg-violet-600" />
            <div>
              <h1 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Mission Planning Logbook
              </h1>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Browse and filter mission plan templates across evaluations and plannings
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData({})}
              disabled={loading}
              className={`h-8 gap-1.5 text-xs transition-all ${
                isDark 
                  ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white' 
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
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
    </div>

    <div className="mx-auto max-w-[1600px] space-y-4 px-6 py-5 animate-slide-up">
      {filtersLoading ? (
        <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 rounded-xl border p-5 shadow-sm transition-colors ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className={`h-3 w-16 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />
              <Skeleton className={`h-9 w-full ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />
            </div>
          ))}
          <div className="flex items-end gap-2 sm:col-span-2">
            <Skeleton className={`h-9 w-28 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />
            <Skeleton className={`h-9 w-28 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />
          </div>
        </div>
      ) : (
        <FilterPanel
          clients={filters.clients}
          pilots={filters.pilots}
          evaluations={filters.evaluations}
          plannings={filters.plannings}
          loading={loading}
          onSearch={(params) => fetchData(params)}
          isDark={isDark}
        />
      )}

      <div className={` ${
        isDark ? 'bg-slate-900 border-slate-800 ' : '  '
      }`}>
        <MissionLogbookTable data={data} loading={loading} isDark={isDark} />
      </div>
    </div>
  </div>
);
}