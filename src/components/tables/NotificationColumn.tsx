"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Notification } from "@/config/types/notification";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { ArrowUpDown, CheckCircle, Trash2, User } from "lucide-react";

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtTime(s: string | null) {
  if (!s) return "";
  return new Date(s).toLocaleString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const columnHelper = createColumnHelper<Notification>();

export const getColumns = (
  handleMarkRead: (id: number) => void,
  setDeleteTarget: (n: Notification) => void
): ColumnDef<Notification, any>[] => [
  {
    accessorKey: "notification_id",
    header: "#",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
        #{String(row.getValue("notification_id")).padStart(4, "0")}
      </span>
    ),
    size: 70,
  },
  {
    accessorKey: "message",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8  text-slate-800 dark:hover:text-white cursor-pointer"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Message
        <ArrowUpDown className="ml-1.5 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const data = row.original;
      return (
        <div className="flex flex-col gap-0.5 py-1">
          <span className="text-xs font-semibold text-slate-800 dark:text-white leading-snug">
            {data.message || "—"}
          </span>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <User className="h-2.5 w-2.5" />
            <span>{data.sender_fullname}</span>
            <span className="opacity-50">•</span>
            <span>{data.sender_profile_code}</span>
          </div>
        </div>
      );
    },
    size: 300,
  },
  {
    accessorKey: "procedure_name",
    header: "Procedure",
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className="text-[10px] border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300 font-medium"
      >
        {row.getValue("procedure_name") || "General"}
      </Badge>
    ),
    size: 140,
  },
  {
    accessorKey: "created_at",
    header: "Received",
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium text-slate-800 dark:text-white">
          {fmtDate(row.getValue("created_at"))}
        </span>
        <span className="text-[10px] text-slate-400">
          {fmtTime(row.getValue("created_at"))}
        </span>
      </div>
    ),
    size: 120,
  },
  {
    accessorKey: "is_read",
    header: "Status",
    cell: ({ row }) => {
      const isRead = row.getValue("is_read") === "Y";
      return (
        <Badge
          variant="outline"
          className={`text-[10px] border ${
            isRead
              ? "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
              : "bg-violet-500/15 text-violet-600 border-violet-500/30 dark:text-violet-400"
          }`}
        >
          {isRead ? "Read" : "Unread"}
        </Badge>
      );
    },
    size: 100,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const n = row.original;
      return (
        <div className="flex items-center justify-end gap-1">
          {n.is_read === "N" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-500/10"
              onClick={() => handleMarkRead(n.notification_id)}
            >
              <CheckCircle className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
            onClick={() => setDeleteTarget(n)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      );
    },
    size: 80,
  },
];