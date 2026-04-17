import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PlanningLogbookRow } from "@/config/types/evaluation-planning";
import { ColumnDef } from "@tanstack/react-table";
import { TFunction } from "i18next";
import { ArrowUpDown, ClipboardList, Trash2 } from "lucide-react";

interface LogbookColumnsOptions {
  openedRowId: number | null;
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
  onManage: (row: PlanningLogbookRow) => void;
  onTestLogbook?: (row: PlanningLogbookRow) => void;
  t: TFunction;  
}

export function getLogbookColumns({
  onDelete,
  onTestLogbook,
  t,  
}: LogbookColumnsOptions): ColumnDef<PlanningLogbookRow>[] {
  return [
    {
      accessorKey: "mission_planning_code",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("planning.missionPlanning.code")}
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.original.mission_planning_code || "—"}
        </span>
      ),
    },
    {
      accessorKey: "mission_planning_desc",
      header: t("planning.form.description"),
      cell: ({ row }) => (
        <span className="text-sm truncate max-w-[200px] block">
          {row.original.mission_planning_desc || "—"}
        </span>
      ),
    },
    {
      accessorKey: "mission_planning_active",
      header: t("planning.form.status"),
      cell: ({ row }) => {
        const active = row.original.mission_planning_active;
        return (
          <Badge
            variant={active === "Y" ? "default" : "secondary"}
            className={
              active === "Y"
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
            }
          >
            {active === "Y" ? t("planning.status.active") : t("planning.status.onHold")}
          </Badge>
        );
      },
    },
    {
      accessorKey: "mission_planning_ver",
      header: t("planning.form.version"),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.mission_planning_ver ?? "—"}</span>
      ),
    },
    {
      id: "actions",
      header: t("planning.table.actions"),
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-1">
            {onTestLogbook && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTestLogbook(row.original)}
                title={t("planning.testLogbook.title")}
              >
                <ClipboardList className="h-4 w-4 mr-1" />
                {t("planning.missionPlanning.tests")}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(row.original.mission_planning_id)}
              title={t("planning.actions.delete")}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];
}