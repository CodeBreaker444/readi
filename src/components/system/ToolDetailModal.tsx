"use client";

import { useTheme } from "@/components/useTheme";
import type { ToolsResponse } from "@/config/types/types";
import { colorByStatus, isDock, statusLabel } from "@/lib/mapUtils";
import { useEffect, useState } from "react";

interface ComponentRow {
  tool_component_id: number;
  fk_tool_id: number;
  component_type: string | null;
  component_sn: string | null;
  component_status: string;
  component_cycles: number | null;
  component_total_cycles: number | null;
  factory_serie: string | null;
  factory_model: string | null;
}

interface Props {
  open: boolean;
  tool: ToolsResponse | null;
  onClose: () => void;
}

export default function ToolDetailModal({ open, tool, onClose }: Props) {
  const { isDark } = useTheme();
  const [components, setComponents] = useState<ComponentRow[]>([]);
  const [loadingComponents, setLoadingComponents] = useState(false);
  const [tab, setTab] = useState<"general" | "specs" | "components">("general");

  useEffect(() => {
    if (!open || !tool) { setComponents([]); setTab("general"); return; }
    fetchComponents(tool.tool_id);
  }, [open, tool]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const fetchComponents = async (toolId: number) => {
    setLoadingComponents(true);
    try {
      const res = await fetch("/api/system/tool/component/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool_id: toolId }),
      });
      const result = await res.json();
      if (result.code === 1) setComponents(result.data ?? []);
    } catch (err) { console.error(err); }
    finally { setLoadingComponents(false); }
  };

  if (!open || !tool) return null;

  const statusBg = colorByStatus(tool.tool_status);
  const flownMin = Math.round((tool.tot_flown_time || 0) / 60);
  const flownKm = ((tool.tot_flown_meter || 0) / 1000).toFixed(2);

  const tabs = [
    { key: "general" as const, label: "General Info" },
    { key: "specs" as const, label: "Specifications" },
    { key: "components" as const, label: `Components (${components.length})` },
  ];

  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white";
  const headerBg = isDark ? "bg-slate-800 border-slate-700/60" : "bg-white border-b";
  const bodyText = isDark ? "text-slate-300" : "text-gray-700";
  const muteText = isDark ? "text-slate-500" : "text-gray-500";
  const borderCls = isDark ? "border-slate-700/60" : "border-gray-200";

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9999 }} onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />

      <div
        className={`relative rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto border ${cardBg}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10 ${headerBg}`}>
          <div>
            <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              Tool Details — {tool.tool_code || `#${tool.tool_id}`}
            </h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="inline-block text-xs text-white px-2 py-0.5 rounded"
                style={{ backgroundColor: statusBg }}>
                {statusLabel(tool.tool_status)}
              </span>
              {isDock(tool) && (
                <span className={`text-xs px-2 py-0.5 rounded
                  ${isDark ? "bg-blue-500/15 text-blue-400" : "bg-blue-100 text-blue-700"}`}>
                  DOCK
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded
                ${isDark ? "bg-slate-700 text-slate-400" : "bg-gray-100 text-gray-600"}`}>
                {tool.active === "Y" ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
          <button onClick={onClose}
            className={`text-2xl leading-none ${isDark ? "text-slate-500 hover:text-slate-300" : "text-gray-400 hover:text-gray-600"}`}>
            &times;
          </button>
        </div>

        <div className={`flex border-b px-6 ${borderCls}`}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
                ${tab === t.key
                  ? "border-blue-500 text-blue-500"
                  : isDark
                    ? "border-transparent text-slate-500 hover:text-slate-300"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="px-6 py-4">

          {tab === "general" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Tool Code" value={tool.tool_code} isDark={isDark} />
                <Field label="Serial Number" value={tool.tool_serialnumber} isDark={isDark} />
                <Field label="Model" value={[tool.factory_type, tool.factory_serie, tool.factory_model].filter(Boolean).join(" ") || null} isDark={isDark} />
                <Field label="Client" value={tool.client_name} isDark={isDark} />
                <Field label="Purchase Date" value={tool.tool_purchase_date} isDark={isDark} />
                <Field label="Activation Date" value={tool.date_activation} isDark={isDark} />
                <div className="col-span-2">
                  <Field label="Description" value={tool.tool_desc} isDark={isDark} />
                </div>
              </div>

              <div className={`border-t pt-4 ${borderCls}`}>
                <h3 className={`text-sm font-semibold mb-3 ${isDark ? "text-slate-200" : "text-gray-800"}`}>
                  Flight Statistics
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Total Missions", value: tool.tot_mission ?? 0, bg: isDark ? "bg-blue-500/10" : "bg-blue-50" },
                    { label: "Flight Time", value: `${flownMin} min`, bg: isDark ? "bg-emerald-500/10" : "bg-green-50" },
                    { label: "Distance", value: `${flownKm} km`, bg: isDark ? "bg-violet-500/10" : "bg-purple-50" },
                  ].map(({ label, value, bg }) => (
                    <div key={label} className={`${bg} p-4 rounded-lg`}>
                      <p className={`text-sm ${muteText}`}>{label}</p>
                      <p className={`text-2xl font-bold ${isDark ? "text-slate-100" : "text-gray-900"}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "specs" && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Field label="Vendor" value={tool.tool_vendor} isDark={isDark} />
              <Field label="GCS Type" value={tool.tool_gcs_type} isDark={isDark} />
              <Field label="Streaming Type" value={tool.tool_streaming_type} isDark={isDark} />
              <Field label="C2 Platform" value={tool.tool_ccPlatform} isDark={isDark} />
              <Field label="Latitude" value={tool.tool_latitude} isDark={isDark} />
              <Field label="Longitude" value={tool.tool_longitude} isDark={isDark} />
              <Field label="Guarantee Days" value={tool.tool_guarantee_day} isDark={isDark} />
              <div className="col-span-2">
                <Field label="Streaming URL" value={tool.tool_streaming_url} isDark={isDark} />
              </div>
            </div>
          )}
          {tab === "components" && (
            loadingComponents ? (
              <div className="flex items-center justify-center py-8">
                <div className={`animate-spin rounded-full h-6 w-6 border-b-2 ${isDark ? "border-blue-400" : "border-blue-600"}`} />
              </div>
            ) : components.length === 0 ? (
              <div className={`text-center py-8 ${muteText}`}>No components found for this tool.</div>
            ) : (
              <div className="space-y-3">
                {components.map((comp) => (
                  <div key={comp.tool_component_id}
                    className={`border rounded-lg p-4 ${isDark ? "border-slate-700/60 bg-slate-700/20" : "border-gray-200"}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className={`font-semibold ${isDark ? "text-slate-200" : "text-gray-800"}`}>
                          {comp.factory_model ?? comp.component_type}
                        </h4>
                        <p className={`text-sm ${muteText}`}>{comp.component_type}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded
                        ${comp.component_status === "OPERATIONAL"
                          ? isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-green-100 text-green-700"
                          : isDark ? "bg-slate-600 text-slate-400" : "bg-gray-100 text-gray-600"
                        }`}>
                        {comp.component_status}
                      </span>
                    </div>
                    <div className={`mt-2 grid grid-cols-3 gap-2 text-sm ${muteText}`}>
                      <div><span className={`font-medium ${isDark ? "text-slate-400" : "text-gray-700"}`}>Code:</span> {comp.factory_serie ?? "—"}</div>
                      <div><span className={`font-medium ${isDark ? "text-slate-400" : "text-gray-700"}`}>Serial:</span> {comp.component_sn ?? "—"}</div>
                      <div><span className={`font-medium ${isDark ? "text-slate-400" : "text-gray-700"}`}>Usage:</span> {comp.component_cycles ?? 0} / {comp.component_total_cycles ?? "—"} hrs</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        <div className={`px-6 py-3 border-t flex justify-end ${borderCls}`}>
          <button onClick={onClose}
            className={`px-4 py-2 text-sm rounded-lg transition-colors
              ${isDark
                ? "bg-slate-700 hover:bg-slate-600 text-slate-300"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, isDark }: { label: string; value: unknown; isDark: boolean }) {
  return (
    <div>
      <p className={`text-xs font-medium ${isDark ? "text-slate-500" : "text-gray-500"}`}>{label}</p>
      <p className={`text-sm mt-0.5 ${isDark ? "text-slate-300" : "text-gray-800"}`}>
        {value != null && value !== "" ? String(value) : "N/A"}
      </p>
    </div>
  );
}