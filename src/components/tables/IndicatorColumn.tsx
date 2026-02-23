import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SpiKpiDefinition } from "@/config/types/safetyMng";
import { createColumnHelper } from "@tanstack/react-table";
import { Pencil, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react";

const columnHelper = createColumnHelper<SpiKpiDefinition>();

export const getIndicatorColumns = (
  isDark: boolean,
  onEdit: (row: SpiKpiDefinition) => void,
  onToggle: (row: SpiKpiDefinition) => void,
  isToggling: number | null,
  areaColors: Record<string, string>
) => [
  columnHelper.accessor("indicator_code", {
    header: "Indicator Code",
    cell: (info) => (
      <span className={` text-sm font-medium ${isDark ? "text-gray-100" : "text-gray-900"} uppercase `}>
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("indicator_area", {
    header: "Area",
    cell: (info) => (
      <Badge 
        variant="outline" 
        className={`text-[10px] font-bold py-0 ${areaColors[info.getValue()] || "border-gray-200" + (isDark ? " text-gray-100" : " text-gray-900")}`}
      >
        {info.getValue()}
      </Badge>
    ),
  }),
  columnHelper.display({
    id: "details",
    header: "Name",
    cell: ({ row }) => (
      <div>
        <p className={`text-sm font-medium ${isDark ? "text-gray-100" : "text-gray-900"}`}>
          {row.original.indicator_name}
        </p>
        <p className={`text-[11px] truncate max-w-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          {row.original.indicator_desc}
        </p>
      </div>
    ),
  }),
  columnHelper.display({
    id: "target",
    header: "Target",
    cell: ({ row }) => (
      <div className="font-mono text-sm">
        <span className={isDark ? "text-gray-200" : "text-gray-700"}>{row.original.target_value}</span>
        <span className={`text-[10px] ml-1 italic ${isDark ? "text-gray-500" : "text-gray-400"}`}>
          {row.original.unit}
        </span>
      </div>
    ),
  }),
  columnHelper.accessor("is_active", {
    header: "Status",
    cell: (info) => {
      const active = info.getValue() === 1;
      return (
        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
          active 
            ? "bg-green-50 text-green-700 border-green-200" 
            : "bg-gray-50 text-gray-600 border-gray-200"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-green-600 animate-pulse" : "bg-gray-400"}`} />
          {active ? "Active" : "Disabled"}
        </div>
      );
    },
  }),
  columnHelper.display({
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onEdit(row.original)}
          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onToggle(row.original)}
          disabled={isToggling === row.original.id}
          className={`h-8 w-8 ${
            row.original.is_active === 1 
              ? "text-orange-500 hover:bg-orange-50" 
              : "text-gray-400 hover:bg-gray-100"
          }`}
        >
          {isToggling === row.original.id ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : row.original.is_active === 1 ? (
            <ToggleRight className="w-5 h-5" />
          ) : (
            <ToggleLeft className="w-5 h-5" />
          )}
        </Button>
      </div>
    ),
  }),
];