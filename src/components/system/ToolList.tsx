"use client";

import { useTheme } from "@/components/useTheme";
import type { ToolsResponse } from "@/config/types/types";
import { colorByStatus, isDock } from "@/lib/mapUtils";

interface ToolListProps {
  tools: ToolsResponse[];
  height?: string;
  onPanTo: (tool: ToolsResponse) => void;
  onDetail: (tool: ToolsResponse) => void;
}

export default function ToolList({ tools, height = "480px", onPanTo, onDetail }: ToolListProps) {
  const { isDark } = useTheme();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-gray-700"}`}>
          Tool List
        </h3>
        <span className={`text-xs px-2 py-0.5 rounded-full
          ${isDark ? "bg-slate-700 text-slate-400" : "bg-gray-200 text-gray-600"}`}>
          {tools.length}
        </span>
      </div>

      <div
        className={`border rounded-lg overflow-auto flex-1
          ${isDark ? "border-slate-700/60" : "border-gray-200"}`}
        style={{ maxHeight: height }}
      >
        <table className="w-full text-sm">
          <thead className={`sticky top-0 z-10 ${isDark ? "bg-slate-700/80" : "bg-gray-50"}`}>
            <tr>
              <th className={`text-left px-3 py-2 font-medium ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                Code / Name
              </th>
              <th className={`text-center px-2 py-2 font-medium w-16 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                Status
              </th>
              <th className={`text-right px-3 py-2 font-medium w-28 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {tools.length === 0 && (
              <tr>
                <td colSpan={3} className={`text-center py-8 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                  No results found.
                </td>
              </tr>
            )}
            {tools.map((t) => (
              <tr
                key={t.tool_id}
                className={`border-t transition-colors
                  ${isDark
                    ? "border-slate-700/40 hover:bg-slate-700/30"
                    : "border-gray-100 hover:bg-gray-50"}`}
              >
                <td className="px-3 py-2">
                  <div className={`font-medium truncate max-w-40 ${isDark ? "text-slate-200" : "text-gray-800"}`}
                    title={t.tool_code ?? ""}>
                    {t.tool_code || `#${t.tool_id}`}
                  </div>
                  <div className={`text-xs truncate max-w-40 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                    {[t.factory_type, t.factory_serie, t.factory_model].filter(Boolean).join(" · ")}
                  </div>
                  {isDock(t) && (
                    <span className={`text-[10px] px-1 rounded
                      ${isDark ? "bg-blue-500/15 text-blue-400" : "bg-blue-100 text-blue-700"}`}>
                      DOCK
                    </span>
                  )}
                </td>
                <td className="text-center px-2 py-2">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: colorByStatus(t.tool_status) }}
                    title={t.tool_status ?? ""}
                  />
                </td>
                <td className="text-right px-3 py-2">
                  <div className="flex gap-1 justify-end">
                    <button
                      onClick={() => onPanTo(t)}
                      className={`text-xs px-2 py-1 rounded border transition-colors
                        ${isDark
                          ? "border-blue-500/40 text-blue-400 hover:bg-blue-500/10"
                          : "border-blue-300 text-blue-600 hover:bg-blue-50"}`}
                    >
                      Locate
                    </button>
                    <button
                      onClick={() => onDetail(t)}
                      className={`text-xs px-2 py-1 rounded border transition-colors
                        ${isDark
                          ? "border-slate-600 text-slate-400 hover:bg-slate-700"
                          : "border-gray-300 text-gray-600 hover:bg-gray-100"}`}
                    >
                      Detail
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

