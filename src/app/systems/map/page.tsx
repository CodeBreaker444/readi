"use client";

import AddComponentModal from "@/components/system/AddComponentModal";
import AddModelModal from "@/components/system/AddModelModal";
import AddToolModal from "@/components/system/AddToolModal";
import type { DroneMapHandle } from "@/components/system/DroneMap";
import MapFilters from "@/components/system/MapFilters";
import MapLegend from "@/components/system/MapLegend";
import ToolDetailModal from "@/components/system/ToolDetailModal";
import ToolList from "@/components/system/ToolList";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/useTheme";
import type { Client, MapFiltersType, ToolsResponse } from "@/config/types/types";
import { isDock, isValidCoord, matchSearch } from "@/lib/mapUtils";
import axios from "axios";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const DroneMap = lazy(() => import("@/components/system/DroneMap"));


const STORAGE_KEY = "droneMapFilters.v2";
const MAP_HEIGHT = "480px";

function defaultFilters(): MapFiltersType {
  return { status: "", clientId: "", search: "", onlyDock: true, onlyInstalled: true };
}

function loadSavedFilters(): MapFiltersType {
  if (typeof window === "undefined") return defaultFilters();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { }
  return defaultFilters();
}

function saveFilters(f: MapFiltersType) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
  } catch { }
}


export default function DroneToolMapPage() {
  const { isDark } = useTheme()
  const [allTools, setAllTools] = useState<ToolsResponse[]>([]);
  const [models, setModels] = useState([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<MapFiltersType>(defaultFilters);
  const [selectedTool, setSelectedTool] = useState<ToolsResponse | null>(null);

  const [showAddTool, setShowAddTool] = useState(false);
  const [showAddModel, setShowAddModel] = useState(false);
  const [showAddComponent, setShowAddComponent] = useState(false);

  const droneMapRef = useRef<DroneMapHandle>(null);

  useEffect(() => {
    setFilters(loadSavedFilters());
  }, []);


  const fetchToolData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/system/tool/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: "ALL", status: "ALL" }),
      });
      const result = await response.json();
      if (result.code === 1) {
        setAllTools(result.data);
      } else {
        toast.error(result.message || "Failed to fetch tool data");
      }
    } catch (error) {
      toast.error("Error fetching tool data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchModels = useCallback(async () => {
    try {
      const response = await fetch("/api/system/tool/model/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const result = await response.json();
      if (result.code === 1) setModels(result.data);
    } catch (error) {
      console.error("Error fetching models:", error);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const response = await axios.get("/api/client/list");
      if (response.data?.clients) setClients(response.data.clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  }, []);


  useEffect(() => {
    fetchToolData();
    fetchModels();
    fetchClients();
  }, [fetchToolData, fetchModels, fetchClients]);


  const filteredTools = useMemo(() => {
    return allTools.filter((t) => {
      if (filters.status && t.tool_status !== filters.status) return false;
      if (filters.clientId && String(t.fk_client_id ?? "") !== filters.clientId) return false;
      if (filters.onlyDock && !isDock(t)) return false;
      if (filters.onlyInstalled && !isValidCoord(t.tool_latitude, t.tool_longitude)) return false;
      if (filters.search && !matchSearch(t, filters.search)) return false;
      return true;
    });
  }, [allTools, filters]);


  const handleFilterChange = useCallback((partial: Partial<MapFiltersType>) => {
    setFilters((prev) => {
      const next = { ...prev, ...partial };
      saveFilters(next);
      return next;
    });
  }, []);

  const handlePanTo = useCallback((tool: ToolsResponse) => {
    if (!isValidCoord(tool.tool_latitude, tool.tool_longitude)) return;
    document.getElementById("drone-map-container")?.scrollIntoView({ behavior: "smooth" });
    droneMapRef.current?.panTo(tool.tool_latitude!, tool.tool_longitude!);
  }, []);

  const handleDetail = useCallback((tool: ToolsResponse) => {
    setSelectedTool(tool);
  }, []);


  return (
    <div className="min-h-screen bg-gray-50">
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
          Drone Tool Map
        </h1>
        <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
          Installed docks & drone systems overview
        </p>
      </div>
    </div>

    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          fetchToolData();
          fetchModels();
          fetchClients();
        }}
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
        <span className="hidden xs:inline">Reload</span>
      </Button>

      <div className="flex gap-2 ml-2 border-l border-slate-200 dark:border-slate-700 pl-4">
        <Button
          size="sm"
          onClick={() => setShowAddTool(true)}
          className="h-8 gap-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-all shadow-sm"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">Add Tool</span>
        </Button>

        <Button
          size="sm"
          onClick={() => setShowAddModel(true)}
          className="h-8 gap-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-all shadow-sm"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">Add Model</span>
        </Button>

        <Button
          size="sm"
          onClick={() => setShowAddComponent(true)}
          className="h-8 gap-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-all shadow-sm"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">Add Component</span>
        </Button>
      </div>
    </div>
  </div>
</div>

      <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        <section className="bg-white rounded-xl border shadow-sm p-4">
          <MapFilters filters={filters} clients={clients} onChange={handleFilterChange} />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 bg-white rounded-xl border shadow-sm p-4">
            <ToolList
              tools={filteredTools}
              height={MAP_HEIGHT}
              onPanTo={handlePanTo}
              onDetail={handleDetail}
            />
          </div>

          <div id="drone-map-container" className="lg:col-span-8 bg-white rounded-xl border shadow-sm p-4">
            {loading ? (
              <div className="flex items-center justify-center text-gray-400" style={{ height: MAP_HEIGHT }}>
                Loading map data…
              </div>
            ) : (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center" style={{ height: MAP_HEIGHT }}>
                    Loading map…
                  </div>
                }
              >
                <DroneMap
                  ref={droneMapRef}
                  tools={filteredTools}
                  height={MAP_HEIGHT}
                  onToolClick={handleDetail}
                />
              </Suspense>
            )}
          </div>
        </section>

        <section className="bg-white rounded-xl border shadow-sm px-4 py-3">
          <MapLegend />
        </section>
      </main>


      {showAddTool && (
        <AddToolModal
          open={showAddTool}
          onClose={() => setShowAddTool(false)}
          onSuccess={() => {
            setShowAddTool(false);
            fetchToolData();
          }}
          models={models}
          clients={clients}
        />
      )}

      {showAddModel && (
        <AddModelModal
          open={showAddModel}
          onClose={() => setShowAddModel(false)}
          onSuccess={() => {
            setShowAddModel(false);
            fetchModels();
          }}
        />
      )}

      {showAddComponent && (
        <AddComponentModal
          open={showAddComponent}
          onClose={() => setShowAddComponent(false)}
          onSuccess={() => setShowAddComponent(false)}
          tools={allTools as any[]}
          models={models}
          clients={clients as any[]}
        />
      )}

      <ToolDetailModal
        open={!!selectedTool}
        tool={selectedTool}
        onClose={() => setSelectedTool(null)}
      />
    </div>
  );
}