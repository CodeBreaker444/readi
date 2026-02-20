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
import type { Client, MapFiltersType, ToolsResponse } from "@/config/types/types";
import { isDock, isValidCoord, matchSearch } from "@/lib/mapUtils";
import axios from "axios";
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
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Drone Tool Map</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Installed docks &amp; drone systems overview
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowAddTool(true)}>Add Tool</Button>
            <Button onClick={() => setShowAddModel(true)}>Add Model</Button>
            <Button onClick={() => setShowAddComponent(true)}>
              Add Component
            </Button>
            <button
              onClick={() => {
                fetchToolData();
                fetchModels();
                fetchClients();
              }}
              disabled={loading}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {loading ? "Loading…" : "↻ Reload"}
            </button>
          </div>
        </div>
      </header>

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