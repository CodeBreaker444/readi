"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/components/useTheme";
import type { ToolsResponse } from "@/config/types/types";
import { colorByStatus, isDock, isValidCoord } from "@/lib/mapUtils";
import { ChevronRight } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

interface ComponentRow {
  tool_component_id: number;
  fk_tool_id: number | null;
  fk_tool_model_id?: number | null;
  system_detached?: boolean;
  fk_parent_component_id?: number | null;
  component_type?: string | null;
  component_desc?: string | null;
  component_code?: string | null;
  component_name?: string | null;
  component_sn?: string | null;
  component_status?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

type MapPanelTab = "systems" | "warehouse";

interface MapSystemPanelProps {
  tools: ToolsResponse[];
  components: ComponentRow[];
  modelMap?: Record<number, string>;
  toolsById?: Map<number, ToolsResponse>;
  height?: string;
  loadingTools?: boolean;
  loadingComponents?: boolean;
  onPanTo: (tool: ToolsResponse) => void;
  onLocateComponent: (comp: ComponentRow, parentToolId?: number | null) => void;
  onDetail: (tool: ToolsResponse) => void;
}

function getHierarchy(systemComponents: ComponentRow[]) {
  const byId = new Map<number, ComponentRow>();
  systemComponents.forEach((c) => byId.set(c.tool_component_id, c));

  const roots: ComponentRow[] = [];
  systemComponents.forEach((c) => {
    const parentId = c.fk_parent_component_id ?? null;
    if (!parentId || !byId.has(parentId)) roots.push(c);
  });

  const childrenOf = (parentId: number) =>
    systemComponents.filter((c) => (c.fk_parent_component_id ?? null) === parentId);

  const ordered: Array<{ comp: ComponentRow; level: number }> = [];
  const walk = (node: ComponentRow, level: number) => {
    ordered.push({ comp: node, level });
    childrenOf(node.tool_component_id).forEach((child) => walk(child, level + 1));
  };

  roots.forEach((r) => walk(r, 0));
  return ordered;
}

function canLocateComponent(
  comp: ComponentRow,
  parentToolId: number | null | undefined,
  toolsById: Map<number, ToolsResponse>,
): boolean {
  if (isValidCoord(comp.latitude, comp.longitude)) return true;
  if (!parentToolId) return false;
  const parent = toolsById.get(parentToolId);
  return isValidCoord(parent?.tool_latitude, parent?.tool_longitude);
}

function canLocateWarehouseComponent(
  comp: ComponentRow,
  toolsById: Map<number, ToolsResponse>,
): boolean {
  if (isValidCoord(comp.latitude, comp.longitude)) return true;
  if (!comp.fk_tool_id) return false;
  const parent = toolsById.get(comp.fk_tool_id);
  return isValidCoord(parent?.tool_latitude, parent?.tool_longitude);
}

function locateButtonClass(isDark: boolean, enabled: boolean) {
  if (!enabled) {
    return isDark
      ? "border-slate-700 text-slate-600 cursor-not-allowed opacity-50"
      : "border-gray-200 text-gray-400 cursor-not-allowed opacity-50";
  }
  return isDark
    ? "border-blue-500/40 text-blue-400 hover:bg-blue-500/10"
    : "border-blue-300 text-blue-600 hover:bg-blue-50";
}

function PanelTableSkeleton({
  columns,
  rows = 6,
  isDark,
}: {
  columns: 3 | 4;
  rows?: number;
  isDark: boolean;
}) {
  const colWidths =
    columns === 3
      ? ["w-full", "w-4", "w-20"]
      : ["w-full", "w-16", "w-4", "w-16"];

  return (
    <table className="w-full text-sm">
      <thead className={`sticky top-0 z-10 ${isDark ? "bg-slate-700/80" : "bg-gray-50"}`}>
        <tr>
          {Array.from({ length: columns }).map((_, i) => (
            <th key={i} className="px-3 py-2">
              <Skeleton className="h-3 w-16" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <tr
            key={rowIdx}
            className={`border-t ${isDark ? "border-slate-700/40" : "border-gray-100"}`}
          >
            {colWidths.map((width, colIdx) => (
              <td key={colIdx} className="px-3 py-2.5">
                <Skeleton className={`h-4 ${width} ${colIdx === 0 ? "max-w-40" : "mx-auto"}`} />
                {colIdx === 0 && (
                  <Skeleton className="h-3 w-24 mt-1.5 max-w-32" />
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function MapSystemPanel({
  tools,
  components,
  modelMap = {},
  toolsById = new Map(),
  height = "480px",
  loadingTools = false,
  loadingComponents = false,
  onPanTo,
  onLocateComponent,
  onDetail,
}: MapSystemPanelProps) {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<MapPanelTab>("systems");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const componentsBySystem = useMemo(() => {
    const map: Record<number, ComponentRow[]> = {};
    components.forEach((c) => {
      if (c.system_detached || c.fk_tool_id == null) return;
      const toolId = Number(c.fk_tool_id);
      if (!map[toolId]) map[toolId] = [];
      map[toolId].push(c);
    });
    return map;
  }, [components]);

  const warehouseComponents = useMemo(
    () => components.filter((c) => c.system_detached === true),
    [components],
  );

  useEffect(() => {
    if (!tools.length) return;
    setExpanded((prev) => {
      const next = { ...prev };
      tools.forEach((tool) => {
        const count = componentsBySystem[tool.tool_id]?.length ?? 0;
        if (count > 0 && next[tool.tool_id] === undefined) {
          next[tool.tool_id] = true;
        }
      });
      return next;
    });
  }, [tools, componentsBySystem]);

  const tabConfig: { key: MapPanelTab; label: string; count: number; loading: boolean }[] = [
    { key: "systems", label: t("systems.map.panel.tabs.systems"), count: tools.length, loading: loadingTools },
    { key: "warehouse", label: t("systems.map.panel.tabs.warehouse"), count: warehouseComponents.length, loading: loadingComponents },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className={`flex gap-1 p-1 mb-3 rounded-lg ${isDark ? "bg-slate-700/50" : "bg-slate-100"}`}>
        {tabConfig.map(({ key, label, count, loading: tabLoading }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === key
              ? isDark
                ? "bg-violet-600 text-white shadow-sm"
                : "bg-white text-violet-700 shadow-sm"
              : isDark
                ? "text-slate-400 hover:text-slate-200"
                : "text-slate-500 hover:text-slate-700"
              }`}
          >
            <span>{label}</span>
            {tabLoading ? (
              <Skeleton className={`h-4 w-5 rounded-full ${activeTab === key ? "bg-violet-400/40" : ""}`} />
            ) : (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === key
                ? isDark ? "bg-violet-500/40 text-violet-100" : "bg-violet-100 text-violet-600"
                : isDark ? "bg-slate-600 text-slate-400" : "bg-slate-200 text-slate-500"
                }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div
        className={`border rounded-lg overflow-auto flex-1 ${isDark ? "border-slate-700/60" : "border-gray-200"}`}
        style={{ maxHeight: height }}
      >
        {activeTab === "systems" && loadingTools ? (
          <PanelTableSkeleton columns={3} rows={6} isDark={isDark} />
        ) : activeTab === "systems" ? (
          <table className="w-full text-sm">
            <thead className={`sticky top-0 z-10 ${isDark ? "bg-slate-700/80" : "bg-gray-50"}`}>
              <tr>
                <th className={`text-left px-3 py-2 font-medium ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                  {t("systems.map.toolList.headers.codeAndName")}
                </th>
                <th className={`text-center px-2 py-2 font-medium w-12 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                  {t("systems.map.toolList.headers.status")}
                </th>
                <th className={`text-right px-3 py-2 font-medium w-32 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                  {t("systems.map.toolList.headers.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {tools.length === 0 && (
                <tr>
                  <td colSpan={3} className={`text-center py-8 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                    {t("systems.map.toolList.noResults")}
                  </td>
                </tr>
              )}
              {tools.map((tt) => {
                const systemComps = componentsBySystem[tt.tool_id] ?? [];
                const hierarchyRows = getHierarchy(systemComps);
                const isOpen = !!expanded[tt.tool_id];
                const systemCanLocate = isValidCoord(tt.tool_latitude, tt.tool_longitude);
                return (
                  <Fragment key={tt.tool_id}>
                    <tr
                      className={`border-t transition-colors ${isDark
                        ? "border-slate-700/40 hover:bg-slate-700/30"
                        : "border-gray-100 hover:bg-gray-50"}`}
                    >
                      <td
                        className="px-3 py-2 cursor-pointer"
                        onClick={() => setExpanded((prev) => ({ ...prev, [tt.tool_id]: !prev[tt.tool_id] }))}
                      >
                        <div className="flex items-start gap-1.5">
                          <ChevronRight
                            className={`h-3.5 w-3.5 mt-1 shrink-0 transition-transform ${isOpen ? "rotate-90" : ""} ${isDark ? "text-slate-500" : "text-gray-400"}`}
                          />
                          <div className="min-w-0">
                            <div
                              className={`font-medium truncate max-w-36 ${isDark ? "text-slate-200" : "text-gray-800"}`}
                              title={tt.tool_code ?? ""}
                            >
                              {tt.tool_code || `#${tt.tool_id}`}
                            </div>
                            <div className={`text-xs truncate max-w-36 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                              {[tt.factory_type, tt.factory_serie, tt.factory_model].filter(Boolean).join(" · ")}
                            </div>
                            <div className="flex flex-wrap items-center gap-1 mt-0.5">
                              {isDock(tt) && (
                                <span className={`text-[10px] px-1 rounded ${isDark ? "bg-blue-500/15 text-blue-400" : "bg-blue-100 text-blue-700"}`}>
                                  {t("systems.map.toolDetail.dock")}
                                </span>
                              )}
                              <span className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                                {t("systems.map.panel.componentCount", { count: systemComps.length })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-center px-2 py-2">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: colorByStatus(tt.tool_status) }}
                          title={tt.tool_status ?? ""}
                        />
                      </td>
                      <td className="text-right px-3 py-2">
                        <div className="flex gap-1 justify-end">
                          <button
                            type="button"
                            disabled={!systemCanLocate}
                            onClick={() => onPanTo(tt)}
                            className={`text-xs px-2 py-1 rounded border transition-colors ${locateButtonClass(isDark, systemCanLocate)}`}
                          >
                            {t("systems.map.toolList.locate")}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDetail(tt)}
                            className={`text-xs px-2 py-1 rounded border transition-colors ${isDark
                              ? "border-slate-600 text-slate-400 hover:bg-slate-700"
                              : "border-gray-300 text-gray-600 hover:bg-gray-100"}`}
                          >
                            {t("systems.map.toolList.detail")}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      hierarchyRows.length ? (
                        hierarchyRows.map(({ comp, level }) => {
                          const compCanLocate = canLocateComponent(comp, tt.tool_id, toolsById);
                          return (
                            <tr
                              key={comp.tool_component_id}
                              className={`border-t ${isDark ? "border-slate-700/30 bg-slate-800/40" : "border-gray-100 bg-slate-50/80"}`}
                            >
                              <td className="py-2 pr-3" style={{ paddingLeft: `${28 + level * 16}px` }}>
                                <p className={`text-xs font-medium truncate max-w-40 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                                  {level > 0 ? "↳ " : ""}
                                  {comp.component_name || comp.component_code || `#${comp.tool_component_id}`}
                                </p>
                                <p className={`text-[10px] truncate max-w-40 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                                  {comp.component_type || "—"}
                                  {comp.component_sn ? ` · ${comp.component_sn}` : ""}
                                </p>
                              </td>
                              <td className="text-center px-2 py-2">
                                <span
                                  className="inline-block w-2 h-2 rounded-full"
                                  style={{ backgroundColor: colorByStatus(comp.component_status ?? undefined) }}
                                  title={comp.component_status ?? ""}
                                />
                              </td>
                              <td className="text-right px-3 py-2">
                                <button
                                  type="button"
                                  disabled={!compCanLocate}
                                  onClick={() => onLocateComponent(comp, tt.tool_id)}
                                  className={`text-xs px-2 py-1 rounded border transition-colors ${locateButtonClass(isDark, compCanLocate)}`}
                                >
                                  {t("systems.map.toolList.locate")}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr className={`border-t ${isDark ? "border-slate-700/30 bg-slate-800/30" : "border-gray-100 bg-slate-50/70"}`}>
                          <td colSpan={3} className={`px-8 py-2 text-[11px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                            {t("systems.map.panel.noComponentsAttached")}
                          </td>
                        </tr>
                      )
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        ) : loadingComponents ? (
          <PanelTableSkeleton columns={4} rows={5} isDark={isDark} />
        ) : (
          <table className="w-full text-sm">
            <thead className={`sticky top-0 z-10 ${isDark ? "bg-slate-700/80" : "bg-gray-50"}`}>
              <tr>
                <th className={`text-left px-3 py-2 font-medium ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                  {t("systems.map.panel.warehouseHeaders.component")}
                </th>
                <th className={`text-left px-2 py-2 font-medium ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                  {t("systems.map.panel.warehouseHeaders.serial")}
                </th>
                <th className={`text-center px-2 py-2 font-medium w-12 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                  {t("systems.map.toolList.headers.status")}
                </th>
                <th className={`text-right px-3 py-2 font-medium w-24 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                  {t("systems.map.toolList.headers.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {warehouseComponents.length === 0 && (
                <tr>
                  <td colSpan={4} className={`text-center py-8 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                    {t("systems.map.panel.noWarehouseComponents")}
                  </td>
                </tr>
              )}
              {warehouseComponents.map((comp) => {
                const compCanLocate = canLocateWarehouseComponent(comp, toolsById);
                return (
                  <tr
                    key={comp.tool_component_id}
                    className={`border-t transition-colors ${isDark
                      ? "border-slate-700/40 hover:bg-slate-700/30"
                      : "border-gray-100 hover:bg-gray-50"}`}
                  >
                    <td className="px-3 py-2">
                      <div className={`font-medium truncate max-w-40 ${isDark ? "text-slate-200" : "text-gray-800"}`}>
                        {comp.component_name || comp.component_code || `#${comp.tool_component_id}`}
                      </div>
                      <div className={`text-xs truncate max-w-40 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                        {comp.component_type || "—"}
                        {comp.fk_tool_model_id && modelMap[comp.fk_tool_model_id]
                          ? ` · ${modelMap[comp.fk_tool_model_id]}`
                          : ""}
                      </div>
                    </td>
                    <td className={`px-2 py-2 text-xs font-mono ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      {comp.component_sn || "—"}
                    </td>
                    <td className="text-center px-2 py-2">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: colorByStatus(comp.component_status ?? undefined) }}
                        title={comp.component_status ?? ""}
                      />
                    </td>
                    <td className="text-right px-3 py-2">
                      <button
                        type="button"
                        disabled={!compCanLocate}
                        onClick={() => onLocateComponent(comp, comp.fk_tool_id)}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${locateButtonClass(isDark, compCanLocate)}`}
                      >
                        {t("systems.map.toolList.locate")}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
