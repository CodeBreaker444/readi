"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlanningLogbookRow } from "@/config/types/evaluation-planning";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, FolderOpen, Settings, Trash2 } from "lucide-react";

interface LogbookColumnActions {
  openedRowId: number | null;
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
  onManage: (row: PlanningLogbookRow) => void;
}

export function getLogbookColumns(
  actions: LogbookColumnActions
): ColumnDef<PlanningLogbookRow>[] {
  return [
    {
      accessorKey: "mission_planning_id",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Mission Plan
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">MPLAN_{row.original.mission_planning_id}</span>
      ),
    },
    {
      accessorKey: "fk_evaluation_id",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Evaluation
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => `EVAL_${row.original.fk_evaluation_id}`,
    },
    {
      accessorKey: "fk_planning_id",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Plan
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => `PLAN_${row.original.fk_planning_id}`,
    },
    {
      accessorKey: "planning_desc",
      header: "Plan Desc",
      cell: ({ row }) => row.original.planning_desc || "—",
    },
    {
      accessorKey: "mission_planning_code",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Mission Code
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
    },
    {
      accessorKey: "mission_planning_desc",
      header: "Mission Description",
    },
    {
      accessorKey: "mission_planning_ver",
      header: "Version",
    },
    {
      accessorKey: "mission_planning_active",
      header: "Active",
      cell: ({ row }) => {
        const isActive = row.original.mission_planning_active === "Y";
        return (
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Yes" : "No"}
          </Badge>
        );
      },
    },
    {
      id: "drone_system",
      header: "Drone System",
      cell: ({ row }) => {
        const { tool_code, tool_desc } = row.original;
        return tool_code ? `${tool_code} ${tool_desc}` : "—";
      },
    },
    {
      accessorKey: "tot_test",
      header: () => <div className="text-center">N. Mission Test</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <Badge variant="outline">{row.original.tot_test || 0}</Badge>
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => {
        const isOpened = actions.openedRowId === row.original.mission_planning_id;

        if (!isOpened) {
          return (
            <div className="text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => actions.onOpen(row.original.mission_planning_id)}
              >
                <FolderOpen className="mr-1 h-3 w-3" />
                Open
              </Button>
            </div>
          );
        }

        return (
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => actions.onDelete(row.original.mission_planning_id)}
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Delete
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => actions.onManage(row.original)}
            >
              <Settings className="mr-1 h-3 w-3" />
              Manage
            </Button>
          </div>
        );
      },
    },
  ];
}