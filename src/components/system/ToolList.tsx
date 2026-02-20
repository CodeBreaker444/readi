"use client";

import type { ToolsResponse } from "@/config/types/types";
import { colorByStatus, isDock } from "@/lib/mapUtils";

interface ToolListProps {
  tools: ToolsResponse[];
  height?: string;
  onPanTo: (tool: ToolsResponse) => void;
  onDetail: (tool: ToolsResponse) => void;
}

export default function ToolList({ tools, height = "480px", onPanTo, onDetail }: ToolListProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Tool List</h3>
        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
          {tools.length}
        </span>
      </div>

      <div className="border rounded-lg overflow-auto flex-1" style={{ maxHeight: height }}>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Code / Name</th>
              <th className="text-center px-2 py-2 font-medium text-gray-600 w-16">Status</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600 w-28">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tools.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center text-gray-400 py-8">
                  No results found.
                </td>
              </tr>
            )}
            {tools.map((t) => (
              <tr key={t.tool_id} className="border-t hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2">
                  <div className="font-medium truncate max-w-40" title={t.tool_code ?? ""}>
                    {t.tool_code || `#${t.tool_id}`}
                  </div>
                  <div className="text-xs text-gray-400 truncate max-w-40">
                    {[t.factory_type, t.factory_serie, t.factory_model].filter(Boolean).join(" · ")}
                  </div>
                  {isDock(t) && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded">DOCK</span>
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
                      className="text-xs px-2 py-1 rounded border border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      Locate
                    </button>
                    <button
                      onClick={() => onDetail(t)}
                      className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
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