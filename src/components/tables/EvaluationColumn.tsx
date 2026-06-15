"use client";

import { Button } from "@/components/ui/button";
import { Evaluation } from "@/config/types/evaluation";
import { cn, formatDateInTz } from "@/lib/utils";
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
  isDark,
}: {
  column: Column<Evaluation, unknown>;
  label: string;
  isDark?: boolean;
}) {
  const sorted = column.getIsSorted();
  return (
    <button
      className={cn(
        "flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider transition-colors",
        isDark
          ? "text-slate-500 hover:text-slate-300"
          : "text-slate-400 hover:text-slate-700"
      )}
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

const STATUS_LIGHT: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  NEW:         { label: "New",         dot: "bg-sky-400",     bg: "bg-sky-50 border-sky-200",         text: "text-sky-700"     },
  IN_PROGRESS: { label: "In Progress", dot: "bg-amber-400",   bg: "bg-amber-50 border-amber-200",     text: "text-amber-700"   },
  PROGRESS:    { label: "In Progress", dot: "bg-amber-400",   bg: "bg-amber-50 border-amber-200",     text: "text-amber-700"   },
  REVIEW:      { label: "Review",      dot: "bg-violet-400",  bg: "bg-violet-50 border-violet-200",   text: "text-violet-700"  },
  COMPLETED:   { label: "Completed",   dot: "bg-emerald-400", bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
  DONE:        { label: "Done",        dot: "bg-emerald-400", bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
  SUSPENDED:   { label: "Suspended",   dot: "bg-orange-400",  bg: "bg-orange-50 border-orange-200",   text: "text-orange-700"  },
  CANCELLED:   { label: "Cancelled",   dot: "bg-slate-400",   bg: "bg-slate-50 border-slate-200",     text: "text-slate-500"   },
};

const STATUS_DARK: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  NEW:         { label: "New",         dot: "bg-sky-400",     bg: "bg-sky-500/15 border-sky-500/30",         text: "text-sky-400"     },
  IN_PROGRESS: { label: "In Progress", dot: "bg-amber-400",   bg: "bg-amber-500/15 border-amber-500/30",     text: "text-amber-400"   },
  PROGRESS:    { label: "In Progress", dot: "bg-amber-400",   bg: "bg-amber-500/15 border-amber-500/30",     text: "text-amber-400"   },
  REVIEW:      { label: "Review",      dot: "bg-violet-400",  bg: "bg-violet-500/15 border-violet-500/30",   text: "text-violet-400"  },
  COMPLETED:   { label: "Completed",   dot: "bg-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30", text: "text-emerald-400" },
  DONE:        { label: "Done",        dot: "bg-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30", text: "text-emerald-400" },
  SUSPENDED:   { label: "Suspended",   dot: "bg-orange-400",  bg: "bg-orange-500/15 border-orange-500/30",   text: "text-orange-400"  },
  CANCELLED:   { label: "Cancelled",   dot: "bg-slate-500",   bg: "bg-slate-700/40 border-slate-600",         text: "text-slate-400"   },
};

function EvalStatusBadge({ status, isDark }: { status: string; isDark?: boolean }) {
  const map   = isDark ? STATUS_DARK : STATUS_LIGHT;
  const fallL = { label: status || "—", dot: "bg-slate-300", bg: "bg-slate-50 border-slate-200",     text: "text-slate-500" };
  const fallD = { label: status || "—", dot: "bg-slate-500", bg: "bg-slate-700/40 border-slate-600", text: "text-slate-400" };
  const cfg   = map[status] ?? (isDark ? fallD : fallL);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-full border ${cfg.bg} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

const RESULT_LIGHT: Record<string, { label: string; bg: string; text: string }> = {
  PROCESSING:      { label: "Processing", bg: "bg-slate-100",   text: "text-slate-500" },
  RESULT_POSITIVE: { label: "Positive",   bg: "bg-emerald-500", text: "text-white"     },
  RESULT_NEGATIVE: { label: "Negative",   bg: "bg-red-500",     text: "text-white"     },
};

const RESULT_DARK: Record<string, { label: string; bg: string; text: string }> = {
  PROCESSING:      { label: "Processing", bg: "bg-slate-700",   text: "text-slate-400" },
  RESULT_POSITIVE: { label: "Positive",   bg: "bg-emerald-500", text: "text-white"     },
  RESULT_NEGATIVE: { label: "Negative",   bg: "bg-red-500",     text: "text-white"     },
};

function EvalResultBadge({ result, isDark }: { result: string; isDark?: boolean }) {
  const map   = isDark ? RESULT_DARK : RESULT_LIGHT;
  const fallL = { label: result || "—", bg: "bg-slate-100", text: "text-slate-400" };
  const fallD = { label: result || "—", bg: "bg-slate-700", text: "text-slate-400" };
  const cfg   = map[result] ?? (isDark ? fallD : fallL);
  return (
    <span className={`inline-flex items-center justify-center px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

function formatDate(raw: unknown, tz?: string): { display: string; relative: string } {
  if (!raw) return { display: "—", relative: "" };
  const str = String(raw);
  const d   = new Date(str);
  if (isNaN(d.getTime())) return { display: str, relative: "" };

  const display  = formatDateInTz(d, tz);
  const now      = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  let relative   = "";
  if (diffDays === 0)      relative = "Today";
  else if (diffDays === 1) relative = "Yesterday";
  else if (diffDays < 30)  relative = `${diffDays}d ago`;
  else if (diffDays < 365) relative = `${Math.floor(diffDays / 30)}mo ago`;

  return { display, relative };
}

export const getEvaluationColumns = (timezone?: string, isDark?: boolean): ColumnDef<Evaluation>[] => [
  {
    accessorKey: "evaluation_year",
    header: ({ column }) => <SortableHeader column={column} label="Year" isDark={isDark} />,
    cell: ({ getValue }) => (
      <div className="flex items-center gap-1.5">
        <span className={cn(
          "inline-flex items-center justify-center h-5 min-w-10.5 px-1.5 rounded font-mono text-[11px] tabular-nums font-semibold",
          isDark ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600"
        )}>
          {String(getValue() ?? "—")}
        </span>
      </div>
    ),
    size: 70,
  },

  {
    accessorKey: "evaluation_id",
    header: ({ column }) => <SortableHeader column={column} label="Eval #" isDark={isDark} />,
    cell: ({ getValue }) => (
      <span className={cn("font-mono text-[11px] tabular-nums font-semibold", isDark ? "text-slate-300" : "text-slate-600")}>
        EVAL_{String(getValue())}
      </span>
    ),
    size: 100,
  },

  {
    accessorKey: "client_name",
    header: ({ column }) => <SortableHeader column={column} label="Client" isDark={isDark} />,
    cell: ({ getValue }) => (
      <span className={cn("truncate max-w-35 inline-block font-normal text-[13px]", isDark ? "text-slate-200" : "text-slate-800")}>
        {String(getValue() ?? "")}
      </span>
    ),
    size: 150,
  },

  {
    accessorKey: "evaluation_desc",
    header: ({ column }) => <SortableHeader column={column} label="Description" isDark={isDark} />,
    cell: ({ getValue }) => {
      const val = String(getValue() ?? "");
      return (
        <div className="max-w-65" title={val}>
          <p className={cn("text-[12.5px] leading-snug line-clamp-2", isDark ? "text-slate-300" : "text-slate-600")}>
            {val || (
              <span className={cn("italic", isDark ? "text-slate-600" : "text-slate-300")}>No description</span>
            )}
          </p>
        </div>
      );
    },
    size: 270,
  },

  {
    accessorKey: "evaluation_request_date",
    header: ({ column }) => <SortableHeader column={column} label="Requested" isDark={isDark} />,
    cell: ({ getValue }) => {
      const { display, relative } = formatDate(getValue(), timezone);
      return (
        <div className="flex items-center gap-1.5">
          <Calendar className={cn("h-3 w-3 shrink-0", isDark ? "text-slate-600" : "text-slate-300")} />
          <div className="flex flex-col leading-none">
            <span className={cn("text-[11px] font-mono tabular-nums", isDark ? "text-slate-300" : "text-slate-600")}>
              {display}
            </span>
            {relative && (
              <span className={cn("text-[10px] mt-0.5", isDark ? "text-slate-500" : "text-slate-400")}>
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
    header: ({ column }) => <SortableHeader column={column} label="Status" isDark={isDark} />,
    cell: ({ getValue }) => <EvalStatusBadge status={String(getValue() ?? "")} isDark={isDark} />,
    size: 140,
  },

  {
    accessorKey: "evaluation_result",
    header: () => (
      <span className={cn("text-[11px] font-semibold uppercase tracking-wider", isDark ? "text-slate-500" : "text-slate-400")}>
        Result
      </span>
    ),
    cell: ({ getValue }) => <EvalResultBadge result={String(getValue() ?? "")} isDark={isDark} />,
    size: 100,
  },

  {
    id: "actions",
    header: () => (
      <span className={cn("text-[11px]", isDark ? "text-slate-500" : "text-slate-400")}>Action</span>
    ),
    cell: ({ row }) => {
      const ev = row.original;
      return (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Link href={`/planning/evaluation-detail?e_id=${ev.evaluation_id}&c_id=${ev.fk_client_id}`}>
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
