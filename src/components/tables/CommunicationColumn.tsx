"use client";

import { Communication } from "@/config/types/communication";
import { type ColumnDef } from "@tanstack/react-table";
import { HiPencil } from "react-icons/hi";
import { Badge } from "../organization/ChecklistUi";
import { DeleteButton } from "../organization/DeleteButton";

export function getCommunicationColumns(
  isDark: boolean,
  onEdit: (communication: Communication) => void,
  onDelete: (communicationId: number) => void
): ColumnDef<Communication>[] {
  const textCls = isDark ? "text-slate-300" : "text-slate-700";

  return [
    {
      accessorKey: "communication_id",
      header: "#ID",
      cell: ({ getValue }) => (
        <span className={`tabular-nums text-sm ${isDark ? "text-slate-500" : "text-slate-400"}`}>
          {String(getValue())}
        </span>
      ),
      size: 60,
    },
    {
      accessorKey: "communication_code",
      header: "Code",
      cell: ({ getValue }) => (
        <span className={`font-mono font-bold ${isDark ? "text-blue-400" : "text-blue-600"}`}>
          {String(getValue())}
        </span>
      ),
    },
    {
      accessorKey: "communication_desc",
      header: "Description",
      cell: ({ getValue }) => (
        <span className={textCls}>{String(getValue())}</span>
      ),
    },
    {
      accessorKey: "communication_ver",
      header: "Ver",
      cell: ({ getValue }) => (
        <span className={`font-mono text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
          v{String(getValue() || "1.0")}
        </span>
      ),
      size: 80,
    },
    {
      accessorKey: "communication_active",
      header: "Status",
      cell: ({ row }) => <Badge active={row.original.communication_active} />,
      size: 100,
    },
    {
      accessorKey: "updated_at",
      header: "Last Update",
      cell: ({ getValue }) => {
        const val = getValue() as string | undefined;
        if (!val) return <span className="text-slate-500">—</span>;
        return (
          <span className="text-xs tabular-nums text-slate-500">
            {new Date(val).toLocaleDateString("en-GB")}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const comm = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => onEdit(comm)}
              className={`group flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-200 ${
                isDark
                  ? "bg-slate-800/60 border-slate-700/50 text-slate-400 hover:bg-blue-500/15 hover:border-blue-500/40 hover:text-blue-400"
                  : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-500"
              }`}
              title="Edit protocol"
            >
              <HiPencil className="w-3.5 h-3.5" />
            </button>

            {comm.communication_active === "N" && (
              <DeleteButton onClick={() => onDelete(comm.communication_id)} />
            )}
          </div>
        );
      },
      size: 80,
    },
  ];
}