"use client";

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
  const [components, setComponents] = useState<ComponentRow[]>([]);
  const [loadingComponents, setLoadingComponents] = useState(false);
  const [tab, setTab] = useState<"general" | "specs" | "components">("general");

  useEffect(() => {
    if (!open || !tool) {
      setComponents([]);
      setTab("general");
      return;
    }
    fetchComponents(tool.tool_id);
  }, [open, tool]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const fetchComponents = async (toolId: number) => {
    setLoadingComponents(true);
    try {
      const response = await fetch("/api/system/tool/component/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool_id: toolId }),
      });
      const result = await response.json();
      if (result.code === 1) {
        setComponents(result.data ?? []);
      }
    } catch (error) {
      console.error("Error fetching components:", error);
    } finally {
      setLoadingComponents(false);
    }
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

  return (
    <>
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: 9999 }}
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/50" />

        <div
          className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Tool Details — {tool.tool_code || `#${tool.tool_id}`}
              </h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span
                  className="inline-block text-xs text-white px-2 py-0.5 rounded"
                  style={{ backgroundColor: statusBg }}
                >
                  {statusLabel(tool.tool_status)}
                </span>
                {isDock(tool) && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">DOCK</span>
                )}
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  {tool.active === "Y" ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              &times;
            </button>
          </div>

          <div className="flex border-b px-6">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.key
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="px-6 py-4">
            {tab === "general" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <Field label="Tool Code" value={tool.tool_code} />
                  <Field label="Serial Number" value={tool.tool_serialnumber} />
                  <Field
                    label="Model"
                    value={
                      [tool.factory_type, tool.factory_serie, tool.factory_model]
                        .filter(Boolean)
                        .join(" ") || null
                    }
                  />
                  <Field label="Client" value={tool.client_name} />
                  <Field label="Purchase Date" value={tool.tool_purchase_date} />
                  <Field label="Activation Date" value={tool.date_activation} />
                  <div className="col-span-2">
                    <Field label="Description" value={tool.tool_desc} />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-3">Flight Statistics</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Total Missions</p>
                      <p className="text-2xl font-bold">{tool.tot_mission ?? 0}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Flight Time</p>
                      <p className="text-2xl font-bold">{flownMin} min</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Distance</p>
                      <p className="text-2xl font-bold">{flownKm} km</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === "specs" && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Vendor" value={tool.tool_vendor} />
                <Field label="GCS Type" value={tool.tool_gcs_type} />
                <Field label="Streaming Type" value={tool.tool_streaming_type} />
                <Field label="C2 Platform" value={tool.tool_ccPlatform} />
                <Field label="Latitude" value={tool.tool_latitude} />
                <Field label="Longitude" value={tool.tool_longitude} />
                <Field label="Guarantee Days" value={tool.tool_guarantee_day} />
                <div className="col-span-2">
                  <Field label="Streaming URL" value={tool.tool_streaming_url} />
                </div>
              </div>
            )}

            {tab === "components" && (
              <>
                {loadingComponents ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                  </div>
                ) : components.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No components found for this tool.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {components.map((comp) => (
                      <div key={comp.tool_component_id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">
                              {comp.factory_model ?? comp.component_type}
                            </h4>
                            <p className="text-sm text-gray-500">{comp.component_type}</p>
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              comp.component_status === "OPERATIONAL"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {comp.component_status}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-sm text-gray-500">
                          <div>
                            <span className="font-medium text-gray-700">Code:</span>{" "}
                            {comp.factory_serie ?? "—"}
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Serial:</span>{" "}
                            {comp.component_sn ?? "—"}
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Usage:</span>{" "}
                            {comp.component_cycles ?? 0} / {comp.component_total_cycles ?? "—"} hrs
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="px-6 py-3 border-t flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="text-sm mt-0.5">{value != null && value !== "" ? String(value) : "N/A"}</p>
    </div>
  );
}