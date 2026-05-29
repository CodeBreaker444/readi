"use client";

import '@/lib/i18n/config';
import { BatteryFilterPanel } from "@/components/logbook/BatteryFilterPanel";
import { BatteryLogbookTable } from "@/components/logbook/BatteryLogbookTable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/components/useTheme";
import { BatteryFilterParams, BatteryLogbookItem, BatterySystemOption } from "@/config/types/logbook";
import axios from "axios";
import { Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface FiltersState {
  systems: BatterySystemOption[];
  statuses: string[];
}

export default function BatteryLogbookPage() {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [data, setData] = useState<BatteryLogbookItem[]>([]);
  const [filters, setFilters] = useState<FiltersState>({ systems: [], statuses: [] });
  const [loading, setLoading] = useState(false);
  const [filtersLoading, setFiltersLoading] = useState(false);

  const fetchFilters = useCallback(async () => {
    setFiltersLoading(true);
    try {
      const res = await axios.post("/api/logbooks/battery/filter", {});
      const json = res.data;
      if (json.code === 200) {
        setFilters({
          systems: json.systems?.data ?? [],
          statuses: json.statuses?.data ?? [],
        });
      }
    } catch (e: any) {
      toast.error(e?.message ?? t('logbooks.batteryLogbook.filterError'));
    } finally {
      setFiltersLoading(false);
    }
  }, []);

  const fetchData = useCallback(async (params: Partial<BatteryFilterParams>) => {
    setLoading(true);
    try {
      const res = await axios.post("/api/logbooks/battery/list", params);
      const json = res.data;
      if (json.code === 200) {
        setData(json.data ?? []);
      } else {
        toast.error(json.message ?? t('logbooks.batteryLogbook.loadError'));
        setData([]);
      }
    } catch (e: any) {
      toast.error(e?.message ?? t('logbooks.batteryLogbook.networkError'));
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
        <div className="mx-auto max-w-[1800px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full bg-violet-600" />
            <div>
              <h1
                className={`font-semibold text-base tracking-tight ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                {t('logbooks.batteryLogbook.title')}
              </h1>
              <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                {t('logbooks.batteryLogbook.subtitle')}
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
              {t('logbooks.batteryLogbook.refresh')}
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
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
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
          <BatteryFilterPanel
            systems={filters.systems}
            statuses={filters.statuses}
            loading={loading}
            isDark={isDark}
            onSearch={(params) => fetchData(params)}
          />
        )}

        <BatteryLogbookTable data={data} loading={loading} isDark={isDark} />
      </div>
    </div>
  );
}
