"use client";

import MaintenanceTable from "@/components/system/MaintenanceTable";
import { MaintenanceTableSkeleton } from "@/components/tables/MaintenanceTableSkeleton";
import { MaintenanceDrone } from "@/config/types/maintenance";
import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";


export default function MaintenancePage() {
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
        <div className="mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Maintenance Dashboard
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Drone systems &amp; component maintenance status
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
              loading
                ? "border-slate-200 text-slate-400 cursor-not-allowed"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <svg
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {loading ? "Loading…" : "Refresh"}
          </button>
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