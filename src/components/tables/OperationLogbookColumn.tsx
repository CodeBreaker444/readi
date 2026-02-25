"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OperationLogbookItem } from "@/config/types/logbook";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Clock, Map } from "lucide-react";


function formatMinutes(mins: number): string {
  if (!mins) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatKm(meters: number): string {
  if (!meters) return "—";
  return (meters / 1000).toFixed(1) + " km";
}

const statusColors: Record<string, string> = {
  COMPLETED:   "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  PLANNED:     "bg-sky-500/15 text-sky-600 border-sky-500/30 dark:text-sky-400",
  IN_PROGRESS: "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400",
  CANCELLED:   "bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400",
  ABORTED:     "bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-400",
};

const resultColors: Record<string, string> = {
  SUCCESS: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  FAILED:  "bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400",
  PARTIAL: "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400",
};


export const operationLogbookColumns: ColumnDef<OperationLogbookItem>[] = [
  {
    accessorKey: "mission_id",
    header: "#",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-slate-400 dark:text-white">
        {String(row.getValue("mission_id")).padStart(4, "0")}
      </span>
    ),
    size: 60,
  },
  {
    id: "date_start",
    accessorKey: "date_start",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 text-slate-400 hover:text-slate-800 dark:hover:text-white"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Start
        <ArrowUpDown className="ml-1.5 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium text-slate-800 dark:text-white">
          {row.original.date_start}
        </span>
        <span className="text-[11px] text-slate-400 dark:text-white">
          {row.original.time_start}
        </span>
      </div>
    ),
    size: 110,
  },
  {
    id: "date_end",
    accessorKey: "date_end",
    header: "End",
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium text-slate-800 dark:text-white">
          {row.original.date_end}
        </span>
        <span className="text-[11px] text-slate-400 dark:text-white">
          {row.original.time_end}
        </span>
      </div>
    ),
    size: 110,
  },
  {
    accessorKey: "pic_fullname",
    header: "PiC",
    cell: ({ row }) => (
      <span className="text-xs text-slate-700 dark:text-slate-200">
        {row.getValue("pic_fullname") || "—"}
      </span>
    ),
    size: 150,
  },
  {
    accessorKey: "client_name",
    header: "Client",
    cell: ({ row }) => (
      <span className="text-xs text-slate-700 dark:text-slate-200">
        {row.getValue("client_name") || "—"}
      </span>
    ),
    size: 140,
  },
  {
    accessorKey: "mission_category_desc",
    header: "Category",
    cell: ({ row }) => {
      const val = row.getValue("mission_category_desc") as string;
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
    accessorKey: "mission_type_desc",
    header: "Type",
    cell: ({ row }) => {
      const val = row.getValue("mission_type_desc") as string;
      return val ? (
        <Badge
          variant="outline"
          className="text-[10px] border-sky-300 text-sky-600 dark:border-sky-700/50 dark:text-sky-400"
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
    id: "drone",
    header: "Drone System",
    cell: ({ row }) => {
      const code = row.original.vehicle_code;
      const desc = row.original.vehicle_desc;
      return (
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
            {code || "—"}
          </span>
          {desc && (
            <span className="text-[10px] text-slate-400 dark:text-white truncate max-w-[120px]">
              {desc}
            </span>
          )}
        </div>
      );
    },
    size: 140,
  },
  {
    accessorKey: "mission_status_desc",
    header: "Status",
    cell: ({ row }) => {
      const val = (row.getValue("mission_status_desc") as string) || "";
      const color =
        statusColors[val.toUpperCase()] ??
        "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700/50 dark:text-white dark:border-slate-600";
      return (
        <Badge variant="outline" className={`text-[10px] border ${color}`}>
          {val || "—"}
        </Badge>
      );
    },
    size: 110,
  },
  {
    accessorKey: "mission_result_desc",
    header: "Result",
    cell: ({ row }) => {
      const val = (row.getValue("mission_result_desc") as string) || "";
      const color =
        resultColors[val.toUpperCase()] ??
        "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700/50 dark:text-white dark:border-slate-600";
      return val ? (
        <Badge variant="outline" className={`text-[10px] border ${color}`}>
          {val}
        </Badge>
      ) : (
        <span className="text-slate-300 dark:text-slate-600">—</span>
      );
    },
    size: 100,
  },
  {
    id: "mission_plan",
    header: "Mission Plan",
    cell: ({ row }) => {
      const code = row.original.mission_planning_code;
      const desc = row.original.mission_planning_desc;
      return code ? (
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-mono font-semibold text-violet-600 dark:text-violet-400">
            {code}
          </span>
          {desc && (
            <span className="text-[10px] text-slate-400 dark:text-white truncate max-w-[130px]">
              {desc}
            </span>
          )}
        </div>
      ) : (
        <span className="text-slate-300 dark:text-slate-600">—</span>
      );
    },
    size: 150,
  },
  {
    accessorKey: "flown_time",
    header: () => (
      <div className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        <span>Time</span>
      </div>
    ),
    cell: ({ row }) => (
      <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
        {formatMinutes(row.getValue("flown_time"))}
      </span>
    ),
    size: 80,
  },
  {
    accessorKey: "flown_meter",
    header: () => (
      <div className="flex items-center gap-1">
        <Map className="h-3 w-3" />
        <span>Distance</span>
      </div>
    ),
    cell: ({ row }) => (
      <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
        {formatKm(row.getValue("flown_meter"))}
      </span>
    ),
    size: 90,
  },
  {
    accessorKey: "mission_notes",
    header: "Notes",
    cell: ({ row }) => {
      const notes = row.getValue("mission_notes") as string;
      return notes ? (
        <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 max-w-[160px]">
          {notes}
        </span>
      ) : (
        <span className="text-slate-300 dark:text-slate-600">—</span>
      );
    },
    size: 180,
  },
];