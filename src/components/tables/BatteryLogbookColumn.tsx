"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BatteryLogbookItem } from "@/config/types/logbook";
import { ColumnDef } from "@tanstack/react-table";
import { TFunction } from "i18next";
import { ArrowUpDown, Battery, ChevronDown, ChevronRight } from "lucide-react";

const statusColors: Record<string, string> = {
  OPERATIONAL:    "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  MAINTENANCE:    "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400",
  DECOMMISSIONED: "bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400",
};

function formatCycleRatio(ratio: number | null): string {
  if (ratio == null) return "—";
  return (ratio * 100).toFixed(0) + "%";
}

function cycleRatioColor(ratio: number | null): string {
  if (ratio == null) return "text-slate-400 dark:text-slate-500";
  if (ratio >= 0.9) return "text-emerald-600 dark:text-emerald-400";
  if (ratio >= 0.7) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function getBatteryLogbookColumns(t: TFunction, isDark: boolean): ColumnDef<BatteryLogbookItem>[] {
  const c = (key: string) => t(`logbooks.batteryLogbook.columns.${key}`);

  return [
    {
        id: "expand",
        header: "",
        cell: ({ row }) => (
          <span className={`flex items-center justify-center p-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            {row.getIsExpanded() ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </span>
        ),
        size: 32,
        enableSorting: false,
      },
    {
      accessorKey: "component_id",
      header: c("id"),
      cell: ({ row }) => (
        <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
          {String(row.getValue("component_id")).padStart(4, "0")}
        </span>
      ),
      size: 55,
    },
    {
      accessorKey: "component_code",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 cursor-pointer h-8 text-xs font-medium text-slate-400 hover:text-slate-800 dark:hover:text-white"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {c("battery")}
          <ArrowUpDown className="ml-1.5 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const code = row.original.component_code;
        const sn = row.original.component_sn;
        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <Battery className="h-3 w-3 text-violet-500 shrink-0" />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                {code || "—"}
              </span>
            </div>
            {sn && (
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                {c("snPrefix")}: {sn}
              </span>
            )}
          </div>
        );
      },
      size: 155,
    },
    {
      id: "drone_system",
      header: c("droneSystem"),
      cell: ({ row }) => {
        const code = row.original.tool_code;
        const desc = row.original.tool_desc;
        return code ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
              {code}
            </span>
            {desc && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-30">
                {desc}
              </span>
            )}
          </div>
        ) : (
          <span className="text-slate-300 dark:text-slate-600">—</span>
        );
      },
      size: 140,
    },
    {
      accessorKey: "component_status",
      header: c("status"),
      cell: ({ row }) => {
        const val = (row.getValue("component_status") as string) || "";
        const color =
          statusColors[val.toUpperCase()] ??
          "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700/50 dark:text-white dark:border-slate-600";
        return (
          <Badge variant="outline" className={`text-[10px] border ${color}`}>
            {val || "—"}
          </Badge>
        );
      },
      size: 115,
    },
    {
      accessorKey: "battery_cycle_ratio",
      header: c("cycleHealth"),
      cell: ({ row }) => {
        const ratio = row.getValue("battery_cycle_ratio") as number | null;
        return (
          <span className={`font-mono text-xs font-semibold ${cycleRatioColor(ratio)}`}>
            {formatCycleRatio(ratio)}
          </span>
        );
      },
      size: 100,
    },
    {
      accessorKey: "component_activation_date",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 cursor-pointer h-8 text-[10px] font-semibold uppercase tracking-widest text-slate-400 hover:text-slate-800 dark:hover:text-white"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {c("installed")}
          <ArrowUpDown className="ml-1.5 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = row.getValue("component_activation_date") as string | null;
        return (
          <span className="text-xs text-slate-700 dark:text-slate-200">
            {date ?? "—"}
          </span>
        );
      },
      size: 110,
    },
    {
      accessorKey: "last_maintenance_date",
      header: c("lastMaint"),
      cell: ({ row }) => {
        const date = row.getValue("last_maintenance_date") as string | null;
        return (
          <span className="text-xs text-slate-700 dark:text-slate-200">
            {date ?? "—"}
          </span>
        );
      },
      size: 110,
    },
    {
      accessorKey: "maintenance_cycle",
      header: c("maintCycle"),
      cell: ({ row }) => {
        const val = row.getValue("maintenance_cycle") as string;
        return val ? (
          <Badge
            variant="outline"
            className="text-[10px] border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300"
          >
            {val}
          </Badge>
        ) : (
          <span className="text-slate-300 dark:text-slate-600">—</span>
        );
      },
      size: 120,
    },
    {
      accessorKey: "component_vendor",
      header: c("vendor"),
      cell: ({ row }) => {
        const val = row.getValue("component_vendor") as string;
        return (
          <span className="text-xs text-slate-600 dark:text-slate-300">
            {val || "—"}
          </span>
        );
      },
      size: 120,
    },
    {
      accessorKey: "component_purchase_date",
      header: c("purchaseDate"),
      cell: ({ row }) => {
        const date = row.getValue("component_purchase_date") as string | null;
        return (
          <span className="text-xs text-slate-600 dark:text-slate-300">
            {date ?? "—"}
          </span>
        );
      },
      size: 115,
    },
  ];
}
