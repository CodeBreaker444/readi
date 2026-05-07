"use client";

import AddComponentModal from "@/components/system/AddComponentModal";
import AddModelModal from "@/components/system/AddModelModal";
import AddSystemModal from "@/components/system/AddSystemModal";
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
import { Loader2, Maximize2, Minimize2, Plus, RefreshCw } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const DroneMap = lazy(() => import("@/components/system/DroneMap"));


const STORAGE_KEY = "droneMapFilters.v2";
const MAP_HEIGHT = typeof window !== "undefined" && window.innerWidth < 640 ? "300px" : "480px";

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
  const [isFullscreen, setIsFullscreen] = useState(false);

  const droneMapRef = useRef<DroneMapHandle>(null);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsFullscreen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  useEffect(() => {
    setFilters(loadSavedFilters());
  }, []);


  const fetchToolData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/system/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: "ALL", status: "ALL" }),
      });
      const result = await response.json();
      if (result.code === 1) {
        setAllTools(result.data);
      } else {
        toast.error(result.message || "Failed to fetch system data");
      }
    } catch (error) {
      toast.error("Error fetching system data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchModels = useCallback(async () => {
    try {
      const response = await fetch("/api/system/model/list", {
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
    <div className="min-h-screen" >
      <div
        className={`top-0 z-10 backdrop-blur-md transition-colors ${isDark
          ? "bg-slate-800 border-b border-slate-700 text-white"
          : "bg-white border-b border-slate-200 text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
          } px-3 sm:px-6 py-4`}
      >
        <div className="mx-auto max-w-[1800px] space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 shrink-0 rounded-full bg-violet-600" />
              <div>
                <h1 className={`font-semibold text-base tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                  Drone System Map
                </h1>
                <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  Installed docks & drone systems overview
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { fetchToolData(); fetchModels(); fetchClients(); }}
              disabled={loading}
              className={`sm:hidden h-8 gap-1.5 text-xs transition-all ${isDark
                ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { fetchToolData(); fetchModels(); fetchClients(); }}
              disabled={loading}
              className={`hidden sm:flex h-8 gap-1.5 text-xs transition-all ${isDark
                ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Reload
            </Button>

            <Button size="sm" onClick={() => setShowAddTool(true)}
              className="h-8 gap-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-all shadow-sm">
              <Plus size={14} /><span className="sm:hidden">System</span><span className="hidden sm:inline">Add System</span>
            </Button>

            <Button size="sm" onClick={() => setShowAddModel(true)}
              className="h-8 gap-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-all shadow-sm">
              <Plus size={14} /><span className="sm:hidden">Model</span><span className="hidden sm:inline">Add Model</span>
            </Button>

            <Button size="sm" onClick={() => setShowAddComponent(true)}
              className="h-8 gap-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-all shadow-sm">
              <Plus size={14} /><span className="sm:hidden">Component</span><span className="hidden sm:inline">Add Component</span>
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 space-y-4">
        <section className={`rounded-xl border shadow-sm p-4
    ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
          <MapFilters filters={filters} clients={clients} onChange={handleFilterChange} />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className={`lg:col-span-4 rounded-xl border shadow-sm p-4
      ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
            <ToolList
              tools={filteredTools}
              height={MAP_HEIGHT}
              onPanTo={handlePanTo}
              onDetail={handleDetail}
            />
          </div>

          <div
            id="drone-map-container"
            className={isFullscreen
              ? "fixed inset-0 z-9999"
              : `lg:col-span-8 rounded-xl border shadow-sm p-4 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`
            }
          >
            <div className="relative w-full h-full">
              {loading ? (
                <div className={`flex items-center justify-center ${isDark ? "text-slate-500" : "text-gray-400"}`}
                  style={{ height: isFullscreen ? "100vh" : MAP_HEIGHT }}>
                  Loading map data…
                </div>
              ) : (
                <Suspense fallback={
                  <div className={`flex items-center justify-center ${isDark ? "text-slate-500" : "text-gray-400"}`}
                    style={{ height: isFullscreen ? "100vh" : MAP_HEIGHT }}>
                    Loading map…
                  </div>
                }>
                  <DroneMap
                    ref={droneMapRef}
                    tools={filteredTools}
                    height={isFullscreen ? "100vh" : MAP_HEIGHT}
                    onToolClick={handleDetail}
                  />
                </Suspense>
              )}
              <button
                onClick={() => setIsFullscreen(f => !f)}
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen map"}
                className="absolute bottom-9 left-1/2 -translate-x-1/2 z-10 p-2 rounded-full shadow-lg backdrop-blur-sm transition-all hover:scale-105 active:scale-95"
                style={{ background: "rgba(15,15,25,0.70)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.15)" }}
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>
          </div>

        </section>

        <section className={`rounded-xl border shadow-sm px-4 py-3
    ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
          <MapLegend />
        </section>
      </main>


      {showAddTool && (
        <AddSystemModal
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