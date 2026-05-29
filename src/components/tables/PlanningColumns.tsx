"use client";

import { Planning } from "@/config/types/evaluation-planning";
import { type ColumnDef } from "@tanstack/react-table";
import { TFunction } from "i18next";
import { ExternalLink, Trash2 } from "lucide-react";
import PlanningStatusBadge from "../planning/StatusBadge";

interface ColumnOptions {
  isDark: boolean;
  onDelete: (row: Planning) => void;
  onOpen: (row: Planning) => void;
  deleting: boolean;
  t: TFunction;
}

export function getPlanningColumns({
  isDark,
  onDelete,
  onOpen,
  deleting,
  t,
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
      accessorKey: "fk_evaluation_id",
      header: t("planning.columns.evaluationCode"),
      size: 110,
      cell: ({ getValue }) => (
        <span className="font-mono text-[11px] tabular-nums">
          EVAL_{String(getValue())}
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
      accessorKey: "user_fullname",
      header: t("planning.columns.requestedBy"),
      size: 150,
      cell: ({ row }) => (
        <span>
          {row.original.user_fullname}{" "}
          <span className="opacity-40 text-[10px]">[{row.original.user_profile_code}]</span>
        </span>
      ),
    },

    {
      id: "assigned_to",
      header: t("planning.columns.assignedTo"),
      size: 150,
      cell: ({ row }) => {
        const pic = row.original.pic_data;
        if (!pic?.fullname) return <span className="opacity-30">—</span>;
        return (
          <span>
            {pic.fullname}{" "}
            <span className="opacity-40 text-[10px]">[{pic.user_profile_code}]</span>
          </span>
        );
      },
    },

    {
      accessorKey: "planning_request_date",
      header: t("planning.form.requestDate"),
      size: 110,
      cell: ({ getValue }) => (
        <span className="tabular-nums text-[11px]">{String(getValue() ?? "")}</span>
      ),
    },
    {
      accessorKey: "last_update",
      header: t("planning.columns.lastAction"),
      size: 110,
      cell: ({ getValue }) => (
        <span className="tabular-nums text-[11px]">{String(getValue() ?? "")}</span>
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
      accessorKey: "luc_procedure_code",
      header: t("planning.columns.procedureCode"),
      size: 160,
      cell: ({ row }) => (
        <span>
          {row.original.luc_procedure_code}{" "}
          <span className="opacity-40 text-[10px]">[{row.original.luc_procedure_ver}]</span>
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
      size: 110,
      cell: ({ row }) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {row.original.planning_status === "NEW" && (
            <button
              onClick={() => onDelete(row.original)}
              disabled={deleting}
              className="inline-flex cursor-pointer items-center gap-1 px-2 py-1 text-[11px] rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors disabled:opacity-40"
            >
              <Trash2 className="w-3 h-3" />
              {t("common.delete")}
            </button>
          )}
          <button
            onClick={() => onOpen(row.original)}
            className="inline-flex cursor-pointer items-center gap-1 px-2 py-1 text-[11px] rounded-md bg-violet-500/10 text-violet-500 hover:bg-violet-500/20 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            {t("planning.columns.open")}
          </button>
        </div>
      ),
    },
  ];
}