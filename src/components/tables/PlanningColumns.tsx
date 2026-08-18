"use client";

import { Planning } from "@/config/types/evaluation-planning";
import { type ColumnDef } from "@tanstack/react-table";
import { TFunction } from "i18next";
import { Eye, ExternalLink, Trash2 } from "lucide-react";
import PlanningStatusBadge from "../planning/StatusBadge";

interface ColumnOptions {
  isDark: boolean;
  onDelete: (row: Planning) => void;
  onOpen: (row: Planning) => void;
  onViewDetails: (row: Planning) => void;
  deleting: boolean;
  t: TFunction;
  canDelete: boolean;
}

export function getPlanningColumns({
  isDark,
  onDelete,
  onOpen,
  onViewDetails,
  deleting,
  t,
  canDelete,
}: ColumnOptions): ColumnDef<Planning, any>[] {
  return [
    {
      accessorKey: "planning_year",
      header: t("planning.columns.yearRef"),
      size: 70,
      cell: ({ getValue }) => (
        <span className="font-mono text-[11px] tabular-nums font-medium">
          {String(getValue() ?? "—")}
        </span>
      ),
    },

    {
      accessorKey: "planning_id",
      header: t("planning.columns.planCode"),
      size: 100,
      cell: ({ getValue }) => (
        <span className="font-mono text-[11px] tabular-nums font-semibold text-violet-500">
          PLAN_{String(getValue())}
        </span>
      ),
    },

    {
      accessorKey: "client_name",
      header: t("planning.columns.customer"),
      size: 140,
      cell: ({ getValue }) => (
        <span className="truncate max-w-[130px] inline-block">{String(getValue() ?? "")}</span>
      ),
    },

    {
      accessorKey: "planning_desc",
      header: t("planning.form.description"),
      size: 240,
      cell: ({ getValue }) => (
        <span className="truncate max-w-[230px] inline-block" title={String(getValue() ?? "")}>
          {String(getValue() ?? "")}
        </span>
      ),
    },

    {
      accessorKey: "planning_status",
      header: t("common.status"),
      size: 140,
      cell: ({ getValue }) => (
        <PlanningStatusBadge status={String(getValue())} isDark={isDark} />
      ),
    },

    {
      accessorKey: "planning_result",
      header: t("planning.form.result"),
      size: 120,
      cell: ({ getValue }) => (
        <PlanningStatusBadge status={String(getValue())} isDark={isDark} />
      ),
    },

    {
      id: "actions",
      header: "",
      size: 100,
      cell: ({ row }) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onViewDetails(row.original)}
            className="inline-flex cursor-pointer items-center justify-center p-1.5 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            title={t("common.viewDetails")}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => onOpen(row.original)}
            className="inline-flex cursor-pointer items-center justify-center p-1.5 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            title={t("planning.columns.open")}
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          {row.original.planning_status === "NEW" && canDelete && (
            <button
              onClick={() => onDelete(row.original)}
              disabled={deleting}
              className="inline-flex cursor-pointer items-center justify-center p-1.5 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-40 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              title={t("common.delete")}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];
}