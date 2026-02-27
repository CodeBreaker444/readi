"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Communication } from "@/config/types/communication";
import { type ColumnDef } from "@tanstack/react-table";
import { HiPencil, HiTrash } from "react-icons/hi";

export function getCommunicationColumns(
  isDark: boolean,
  onEdit: (communication: Communication) => void,
  onDelete: (communicationId: number) => void
): ColumnDef<Communication>[] {
  return [
    {
      accessorKey: "communication_id",
      header: "#ID",
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-slate-700 dark:text-slate-200">
          {String(getValue()).padStart(4, "0")}
        </span>
      ),
      size: 70,
    },
    {
      accessorKey: "communication_code",
      header: "Code",
      cell: ({ getValue }) => (
        <span className="text-xs font-semibold  text-slate-700 dark:text-slate-200 tracking-tight">
          {String(getValue())}
        </span>
      ),
      size: 120,
    },
    {
      accessorKey: "communication_desc",
      header: "Description",
      cell: ({ getValue }) => (
        <span className="text-xs text-slate-700 dark:text-slate-200 leading-snug">
          {String(getValue())}
        </span>
      ),
    },
    {
      accessorKey: "communication_ver",
      header: "Ver",
      cell: ({ getValue }) => (
        <span className="w-fit rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          v{String(getValue() || "1.0")}
        </span>
      ),
      size: 80,
    },
    {
      accessorKey: "communication_active",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.original.communication_active === "Y";
        return (
          <Badge
            variant="outline"
            className={`text-[10px] border ${
              isActive
                ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
                : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
            }`}
          >
            {isActive ? "Active" : "Inactive"}
          </Badge>
        );
      },
      size: 100,
    },
    {
      accessorKey: "updated_at",
      header: "Last Update",
      cell: ({ getValue }) => {
        const val = getValue() as string | undefined;
        if (!val) return <span className="text-slate-300 dark:text-slate-600">—</span>;
        return (
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
              {new Date(val).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        );
      },
      size: 120,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const comm = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(comm)}
              className="h-7 w-7 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
              title="Edit protocol"
            >
              <HiPencil className="w-3.5 h-3.5" />
            </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(comm.communication_id)}
                className="h-7 w-7 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                title="Delete protocol"
              >
                <HiTrash className="w-3.5 h-3.5" />
              </Button>
          </div>
        );
      },
      size: 80,
    },
  ];
}