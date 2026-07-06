"use client";

import { FeatureGate } from "@/components/permissions/FeatureGate";
import DroneMapSkeleton from "@/components/system/DroneMapSkeleton";
import type { DroneMapHandle } from "@/components/system/DroneMap";
import MapFilters from "@/components/system/MapFilters";
import MapLegend from "@/components/system/MapLegend";
import MapSystemPanel from "@/components/system/MapSystemPanel";
import ToolDetailModal from "@/components/system/ToolDetailModal";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/useTheme";
import type { Client, MapFiltersType, ToolsResponse } from "@/config/types/types";
import { isDock, isValidCoord, matchSearch } from "@/lib/mapUtils";
import axios from "axios";
import { Loader2, Maximize2, Minimize2, Plus, RefreshCw } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const DroneMap = lazy(() => import("@/components/system/DroneMap"));
const AddComponentModal = lazy(() => import("@/components/system/AddComponentModal"));
const AddModelModal = lazy(() => import("@/components/system/AddModelModal"));
const AddSystemModal = lazy(() => import("@/components/system/AddSystemModal"));


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
  const { t } = useTranslation();

  const [allTools, setAllTools] = useState<ToolsResponse[]>([]);
  const [componentData, setComponentData] = useState<any[]>([]);
  const [models, setModels] = useState([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingComponents, setLoadingComponents] = useState(true);

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
        toast.error(t('systems.map.fetchFailed'));
      }
    } catch (error) {
      toast.error(t('systems.map.fetchError'));
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

  const fetchAllComponents = useCallback(async () => {
    setLoadingComponents(true);
    try {
      const response = await fetch("/api/system/component/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const result = await response.json();
      if (result.code === 1) setComponentData(result.data);
    } catch (error) {
      console.error("Error fetching components:", error);
    } finally {
      setLoadingComponents(false);
    }
  }, []);


  useEffect(() => {
    fetchToolData();
    fetchModels();
    fetchClients();
    fetchAllComponents();
  }, [fetchToolData, fetchModels, fetchClients, fetchAllComponents]);


  const panelTools = useMemo(() => {
    return allTools.filter((t) => {
      if (filters.status && t.tool_status !== filters.status) return false;
      if (filters.clientId && String(t.fk_client_id ?? "") !== filters.clientId) return false;
      if (filters.search && !matchSearch(t, filters.search)) return false;
      return true;
    });
  }, [allTools, filters]);

  const filteredTools = useMemo(() => {
    return panelTools.filter((t) => {
      if (filters.onlyDock && !isDock(t)) return false;
      if (filters.onlyInstalled && !isValidCoord(t.tool_latitude, t.tool_longitude)) return false;
      return true;
    });
  }, [panelTools, filters]);

  const toolsById = useMemo(() => {
    const map = new Map<number, ToolsResponse>();
    allTools.forEach((t) => map.set(t.tool_id, t));
    return map;
  }, [allTools]);


  const handleFilterChange = useCallback((partial: Partial<MapFiltersType>) => {
    setFilters((prev) => {
      const next = { ...prev, ...partial };
      saveFilters(next);
      return next;
    });
  }, []);

  const scrollToMap = useCallback(() => {
    document.getElementById("drone-map-container")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handlePanTo = useCallback((tool: ToolsResponse) => {
    if (!isValidCoord(tool.tool_latitude, tool.tool_longitude)) {
      toast.error(t("systems.map.panel.noLocation"));
      return;
    }
    scrollToMap();
    const label = tool.tool_code || `#${tool.tool_id}`;
    droneMapRef.current?.panTo(
      tool.tool_latitude!,
      tool.tool_longitude!,
      16,
      `<div style="font-weight:600">${label}</div>`,
    );
  }, [scrollToMap, t]);

  const handleLocateComponent = useCallback((
    comp: { tool_component_id: number; component_name?: string | null; component_code?: string | null; component_type?: string | null; latitude?: number | null; longitude?: number | null; fk_tool_id?: number | null },
    parentToolId?: number | null,
  ) => {
    let lat = comp.latitude;
    let lon = comp.longitude;

    if (!isValidCoord(lat, lon) && parentToolId) {
      const parent = toolsById.get(parentToolId);
      lat = parent?.tool_latitude ?? undefined;
      lon = parent?.tool_longitude ?? undefined;
    }

    if (!isValidCoord(lat, lon)) {
      toast.error(t("systems.map.panel.noLocation"));
      return;
    }

    scrollToMap();
    const name = comp.component_name || comp.component_code || `#${comp.tool_component_id}`;
    const type = comp.component_type ? `<div style="font-size:12px;color:#666;margin-top:2px">${comp.component_type}</div>` : "";
    droneMapRef.current?.panTo(
      lat!,
      lon!,
      16,
      `<div style="font-weight:600">${name}</div>${type}`,
    );
  }, [scrollToMap, t, toolsById]);

  const handleDetail = useCallback((tool: ToolsResponse) => {
    setSelectedTool(tool);
  }, []);

  const modelMap = useMemo(() => {
    const map: Record<number, string> = {};
    models.forEach((m: any) => { map[m.tool_model_id] = `${m.factory_type} ${m.factory_model}`; });
    return map;
  }, [models]);

  const refreshAll = useCallback(() => {
    fetchToolData();
    fetchModels();
    fetchClients();
    fetchAllComponents();
  }, [fetchToolData, fetchModels, fetchClients, fetchAllComponents]);


  return (
    <div className="min-h-screen" >
      <div
        className={`top-0 z-10 backdrop-blur-md transition-colors ${isDark
          ? "bg-slate-800 border-b border-slate-700 text-white"
          : "bg-white border-b border-slate-200 text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
          } px-3 sm:px-6 py-4`}
      >
        <div className="mx-auto space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 shrink-0 rounded-full bg-violet-600" />
              <div>
                <h1 className={`font-semibold text-base tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                  {t('systems.map.title')}
                </h1>
                <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  {t('systems.map.subtitle')}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAll}
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
              onClick={refreshAll}
              disabled={loading}
              className={`hidden sm:flex h-8 gap-1.5 text-xs transition-all ${isDark
                ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {t('systems.map.reload')}
            </Button>

            <FeatureGate feature="systems_map" require="edit">
              <Button size="sm" onClick={() => setShowAddTool(true)}
                className="h-8 gap-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-all shadow-sm">
                <Plus size={14} /><span className="sm:hidden">{t('systems.manage.buttons.system')}</span><span className="hidden sm:inline">{t('systems.manage.buttons.addSystem')}</span>
              </Button>
            </FeatureGate>

            <FeatureGate feature="systems_map" require="edit">
              <Button size="sm" onClick={() => setShowAddModel(true)}
                className="h-8 gap-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-all shadow-sm">
                <Plus size={14} /><span className="sm:hidden">{t('systems.manage.buttons.model')}</span><span className="hidden sm:inline">{t('systems.manage.buttons.addModel')}</span>
              </Button>
            </FeatureGate>

            <FeatureGate feature="systems_map" require="edit">
              <Button size="sm" onClick={() => setShowAddComponent(true)}
                className="h-8 gap-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-all shadow-sm">
                <Plus size={14} /><span className="sm:hidden">{t('systems.manage.buttons.component')}</span><span className="hidden sm:inline">{t('systems.manage.buttons.addComponent')}</span>
              </Button>
            </FeatureGate>
          </div>
        </div>
      </div>

      <main className=" mx-auto px-3 sm:px-4 py-3 sm:py-4 space-y-4">
        <section className={`rounded-xl border shadow-sm p-4
    ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
          <MapFilters filters={filters} clients={clients} onChange={handleFilterChange} />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className={`lg:col-span-4 rounded-xl border shadow-sm p-4
      ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
            <MapSystemPanel
              tools={panelTools}
              components={componentData}
              modelMap={modelMap}
              toolsById={toolsById}
              height={MAP_HEIGHT}
              loadingTools={loading}
              loadingComponents={loadingComponents}
              onPanTo={handlePanTo}
              onLocateComponent={handleLocateComponent}
              onDetail={handleDetail}
            />
          </div>

          <div id="drone-map-container" className={`lg:col-span-8 rounded-xl border shadow-sm p-4
      ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
            {loading ? (
              <DroneMapSkeleton height={isFullscreen ? "100vh" : MAP_HEIGHT} />
            ) : (
              <div className="relative">
                <Suspense fallback={
                  <DroneMapSkeleton height={isFullscreen ? "100vh" : MAP_HEIGHT} />
                }>
                  <DroneMap
                    ref={droneMapRef}
                    tools={filteredTools}
                    height={isFullscreen ? "100vh" : MAP_HEIGHT}
                    onToolClick={handleDetail}
                  />
                </Suspense>
                <button
                  onClick={() => setIsFullscreen(f => !f)}
                  title={isFullscreen ? "Exit fullscreen" : "Fullscreen map"}
                  className="cursor-pointer absolute bottom-9 left-1/2 -translate-x-1/2 z-10 p-2 rounded-full shadow-lg backdrop-blur-sm transition-all hover:scale-105 active:scale-95"
                  style={{ background: "rgba(15,15,25,0.70)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.15)" }}
                >
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
              </div>
            )}
          </div>

        </section>

        <section className={`rounded-xl border shadow-sm px-4 py-3
    ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
          <MapLegend />
        </section>
      </main>


      {showAddTool && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {showAddModel && (
        <Suspense fallback={null}>
          <AddModelModal
            open={showAddModel}
            onClose={() => setShowAddModel(false)}
            onSuccess={() => {
              setShowAddModel(false);
              fetchModels();
            }}
          />
        </Suspense>
      )}

      {showAddComponent && (
        <Suspense fallback={null}>
          <AddComponentModal
            open={showAddComponent}
            onClose={() => setShowAddComponent(false)}
            onSuccess={() => {
              setShowAddComponent(false);
              fetchAllComponents();
            }}
            tools={allTools as any[]}
            models={models}
          />
        </Suspense>
      )}

      <ToolDetailModal
        open={!!selectedTool}
        tool={selectedTool}
        onClose={() => setSelectedTool(null)}
      />
    </div>
  );
}