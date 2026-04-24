"use client";

import { Button } from "@/components/ui/button";
import { Evaluation } from "@/config/types/evaluation";
import { formatDateInTz } from "@/lib/utils";
import { Column, type ColumnDef } from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

function SortableHeader({
  column,
  label,
}: {
  column: Column<Evaluation, unknown>;
  label: string;
}) {
  const sorted = column.getIsSorted();
  return (
    <button
      className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-700 transition-colors"
      onClick={() => column.toggleSorting()}
    >
      {label}
      {sorted === "asc" ? (
        <ArrowUp className="h-3 w-3" />
      ) : sorted === "desc" ? (
        <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-30" />
      )}
    </button>
  );
}

 
const STATUS_CONFIG: Record<
  string,
  { label: string; dot: string; bg: string; text: string }
> = {
  NEW: {
    label: "New",
    dot: "bg-sky-400",
    bg: "bg-sky-50 border-sky-200",
    text: "text-sky-700",
  },
  IN_PROGRESS: {
    label: "In Progress",
    dot: "bg-amber-400",
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
  },
  PROGRESS: {
    label: "In Progress",
    dot: "bg-amber-400",
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
  },
  REVIEW: {
    label: "Review",
    dot: "bg-violet-400",
    bg: "bg-violet-50 border-violet-200",
    text: "text-violet-700",
  },
  COMPLETED: {
    label: "Completed",
    dot: "bg-emerald-400",
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
  },
  DONE: {
    label: "Done",
    dot: "bg-emerald-400",
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
  },
  SUSPENDED: {
    label: "Suspended",
    dot: "bg-orange-400",
    bg: "bg-orange-50 border-orange-200",
    text: "text-orange-700",
  },
  CANCELLED: {
    label: "Cancelled",
    dot: "bg-slate-400",
    bg: "bg-slate-50 border-slate-200",
    text: "text-slate-500",
  },
};

function EvalStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status || "—",
    dot: "bg-slate-300",
    bg: "bg-slate-50 border-slate-200",
    text: "text-slate-500",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-full border ${cfg.bg} ${cfg.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

 
const RESULT_CONFIG: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  PROCESSING: {
    label: "Processing",
    bg: "bg-slate-100",
    text: "text-slate-500",
  },
  RESULT_POSITIVE: {
    label: "Positive",
    bg: "bg-emerald-500",
    text: "text-white",
  },
  RESULT_NEGATIVE: {
    label: "Negative",
    bg: "bg-red-500",
    text: "text-white",
  },
};

function EvalResultBadge({ result }: { result: string }) {
  const cfg = RESULT_CONFIG[result] ?? {
    label: result || "—",
    bg: "bg-slate-100",
    text: "text-slate-400",
  };
  return (
    <span
      className={`inline-flex items-center justify-center px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded ${cfg.bg} ${cfg.text}`}
    >
      {cfg.label}
    </span>
  );
}

 
function formatDate(raw: unknown, tz?: string): { display: string; relative: string } {
  if (!raw) return { display: "—", relative: "" };
  const str = String(raw);
  const d = new Date(str);
  if (isNaN(d.getTime())) return { display: str, relative: "" };

  const display = formatDateInTz(d, tz);

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  let relative = "";
  if (diffDays === 0) relative = "Today";
  else if (diffDays === 1) relative = "Yesterday";
  else if (diffDays < 30) relative = `${diffDays}d ago`;
  else if (diffDays < 365) relative = `${Math.floor(diffDays / 30)}mo ago`;

  return { display, relative };
}
 
export const getEvaluationColumns = (timezone?: string): ColumnDef<Evaluation>[] => [
  {
    accessorKey: "evaluation_year",
    header: ({ column }) => <SortableHeader column={column} label="Year" />,
    cell: ({ getValue }) => {
      const year = getValue();
      return (
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center h-5 min-w-[42px] px-1.5 rounded bg-slate-100 font-mono text-[11px] tabular-nums font-semibold text-slate-600">
            {String(year ?? "—")}
          </span>
        </div>
      );
    },
    size: 70,
  },

  {
    accessorKey: "evaluation_id",
    header: ({ column }) => (
      <SortableHeader column={column} label="Eval #" />
    ),
    cell: ({ getValue }) => (
      <span className="font-normal text-[11px] tabular-nums font-semibold text-slate-600">
        EVAL_{String(getValue())}
      </span>
    ),
    size: 100,
  },

  {
    accessorKey: "client_name",
    header: ({ column }) => (
      <SortableHeader column={column} label="Client" />
    ),
    cell: ({ getValue }) => (
      <span className="truncate max-w-[140px] inline-block font-normal text-[13px] text-slate-800">
        {String(getValue() ?? "")}
      </span>
    ),
    size: 150,
  },

  {
    accessorKey: "evaluation_desc",
    header: ({ column }) => (
      <SortableHeader column={column} label="Description" />
    ),
    cell: ({ getValue }) => {
      const val = String(getValue() ?? "");
      return (
        <div className="max-w-[260px]" title={val}>
          <p className="text-[12.5px] text-slate-600 leading-snug line-clamp-2">
            {val || (
              <span className="text-slate-300 italic">No description</span>
            )}
          </p>
        </div>
      );
    },
    size: 270,
  },

  {
    accessorKey: "evaluation_request_date",
    header: ({ column }) => (
      <SortableHeader column={column} label="Requested" />
    ),
    cell: ({ getValue }) => {
      const { display, relative } = formatDate(getValue(), timezone);
      return (
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3 text-slate-300 shrink-0" />
          <div className="flex flex-col leading-none">
            <span className="text-[11px] font-mono tabular-nums text-slate-600">
              {display}
            </span>
            {relative && (
              <span className="text-[10px] text-slate-400 mt-0.5">
                {relative}
              </span>
            )}
          </div>
        </div>
      );
    },
    size: 130,
  },

  {
    accessorKey: "evaluation_status",
    header: ({ column }) => (
      <SortableHeader column={column} label="Status" />
    ),
    cell: ({ getValue }) => (
      <EvalStatusBadge status={String(getValue() ?? "")} />
    ),
    size: 140,
  },

  {
    accessorKey: "evaluation_result",
    header: "Result",
    cell: ({ getValue }) => (
      <EvalResultBadge result={String(getValue() ?? "")} />
    ),
    size: 100,
  },

  {
    id: "actions",
    header: () => <span className="text-[11px] text-slate-400">Action</span>,
    cell: ({ row }) => {
      const ev = row.original;
      return (
        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Link
            href={`/planning/evaluation-detail?e_id=${ev.evaluation_id}&c_id=${ev.fk_client_id}`}
          >
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-[11px] font-medium bg-violet-500/10 text-violet-600 border-violet-200 hover:bg-violet-500/20 hover:border-violet-300 transition-all"
            >
              <ExternalLink className="h-3 w-3" />
              Open
            </Button>
          </Link>
        </div>
      );
    },
    size: 100,
  },
];