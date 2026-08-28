"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SystemCell } from "@/components/tables/SystemCell";
import { OperationLogbookItem } from "@/config/types/logbook";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Clock, Map, Tag } from "lucide-react";
import { FaArrowsRotate } from "react-icons/fa6";


export interface OperationLogbookTableMeta {
  onViewDetails: (mission: OperationLogbookItem) => void;
}

 
function parseDMYToTime(dateStr: string, timeStr?: string): number {
  if (!dateStr) return 0;
  const [d, m, y] = dateStr.split('/').map(Number);
  if (!d || !m || !y) return 0;
  const [hh, mm] = (timeStr || '00:00').split(':').map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0).getTime();
}

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
  SCHEDULED:   "bg-sky-500/15 text-sky-600 border-sky-500/30 dark:text-sky-400",
  IN_PROGRESS: "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400",
  INFLIGHT:    "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400",
  IN_FLIGHT:   "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400",
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
    accessorKey: "mission_code",
    header: "Mission ID",
    cell: ({ row, table }) => {
      const meta = table.options.meta as OperationLogbookTableMeta;
      const code = row.original.mission_code || String(row.original.mission_id).padStart(4, "0");
      const groupLabel = row.original.mission_group_label;
      return (
        <div className="flex items-center gap-1.5">
          <button
            className="font-mono text-xs text-violet-600 hover:underline cursor-pointer dark:text-violet-400"
            onClick={(e) => {
              e.stopPropagation();
              meta.onViewDetails(row.original);
            }}
          >
            {code}
          </button>
          {groupLabel && (
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal shrink-0">
              <Tag className="mr-0.5 h-2.5 w-2.5" />
              {groupLabel}
              {row.original.is_recurrent && <FaArrowsRotate className="ml-1 h-2.5 w-2.5" />}
            </Badge>
          )}
        </div>
      );
    },
    size: 90,
  },
  {
    id: "date_start",
    accessorKey: "date_start",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 cursor-pointer h-8 text-xs font-medium text-slate-400 hover:text-slate-800 dark:hover:text-white"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        START
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
    sortingFn: (rowA, rowB) =>
      parseDMYToTime(rowA.original.date_start, rowA.original.time_start) -
      parseDMYToTime(rowB.original.date_start, rowB.original.time_start),
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
    cell: ({ row }) => (
      <SystemCell code={row.original.vehicle_code} name={row.original.vehicle_desc} size="sm" />
    ),
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
  // {
  //   accessorKey: "mission_result_desc",
  //   header: "Result",
  //   cell: ({ row }) => {
  //     const val = (row.getValue("mission_result_desc") as string) || "";
  //     const color =
  //       resultColors[val.toUpperCase()] ??
  //       "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700/50 dark:text-white dark:border-slate-600";
  //     return val ? (
  //       <Badge variant="outline" className={`text-[10px] border ${color}`}>
  //         {val}
  //       </Badge>
  //     ) : (
  //       <span className="text-slate-300 dark:text-slate-600">—</span>
  //     );
  //   },
  //   size: 100,
  // },
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
        <span className="text-slate-300 dark:text-slate-600">-</span>
      );
    },
    size: 150,
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
      <div className="flex flex-col gap-0.5">
        <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
          {formatKm(row.original.flown_meter)}
        </span>
        <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-0.5">
          <Clock className="h-2.5 w-2.5" />
          {formatMinutes(row.original.flown_time)}
        </span>
      </div>
    ),
    size: 100,
  },
  {
    accessorKey: "battery_serial_number",
    header: "Battery SN",
    cell: ({ row }) => {
      const sn = row.getValue("battery_serial_number") as string;
      return sn ? (
        <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
          {sn}
        </span>
      ) : (
        <span className="text-slate-300 dark:text-slate-600">—</span>
      );
    },
    size: 140,
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