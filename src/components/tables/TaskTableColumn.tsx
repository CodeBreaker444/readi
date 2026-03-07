"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ColumnDef } from "@tanstack/react-table";
import {
    ArrowUpDown,
    CheckCircle2,
    Circle,
    ClipboardList,
    Eye,
    MessageSquare,
} from "lucide-react";


export type ComponentType = "Checklist" | "Communication";
export type FilterMode = "combined" | "checklist" | "communication";

export interface ChecklistRow {
  checklist_id: number;
  checklist_code: string;
  checklist_desc: string;
  checklist_json: any;
  checklist_ver: number;
  checklist_active: string;
  created_at: string;
  updated_at: string;
}

export interface CommunicationItem {
  communication_id: number;
  subject: string;
  message: string;
  communication_type: string;
  communication_level: string;
  priority: string;
  status: string;
  sent_by_user_id: number;
  sender_name?: string;
  communication_to: number[];
  communication_file_name: string | null;
  sent_at: string;
}

export interface UnifiedRow {
  id: string;
  title: string;
  description: string;
  component: ComponentType;
  item_id: number;
  code: string;
  status: string;
  active: boolean;
  raw: any;
  checklist_json?: any;
}


export function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (["active", "y", "completed", "done", "sent"].includes(s)) {
    return (
      <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px]">
        {status}
      </Badge>
    );
  }
  if (["read"].includes(s)) {
    return (
      <Badge className="bg-blue-600 hover:bg-blue-600 text-white text-[10px]">
        {status}
      </Badge>
    );
  }
  if (["inactive", "n", "pending", "new"].includes(s)) {
    return (
      <Badge variant="secondary" className="text-[10px]">
        {status}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px]">
      {status}
    </Badge>
  );
}

export function ActiveIcon({ active }: { active: boolean }) {
  return active ? (
    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
  ) : (
    <Circle className="h-4 w-4 text-amber-500" />
  );
}

export function ComponentBadge({ component }: { component: ComponentType }) {
  return component === "Checklist" ? (
    <div className="flex items-center gap-1.5">
      <ClipboardList className="h-3.5 w-3.5 text-violet-500" />
      <span className="text-xs font-medium">Checklist</span>
    </div>
  ) : (
    <div className="flex items-center gap-1.5">
      <MessageSquare className="h-3.5 w-3.5 text-sky-500" />
      <span className="text-xs font-medium">Communication</span>
    </div>
  );
}


export function createTaskTableColumns(handlers: {
  onChecklistPreview: (row: UnifiedRow) => void;
  onViewRawJson: (row: UnifiedRow) => void;
}): ColumnDef<UnifiedRow>[] {
  return [
    {
      id: "active_icon",
      header: "",
      size: 44,
      enableSorting: false,
      cell: ({ row }) => <ActiveIcon active={row.original.active} />,
    },
    {
      accessorKey: "title",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 text-xs font-semibold"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Title
          <ArrowUpDown className="ml-1.5 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-medium text-sm truncate block max-w-[220px]">
          {row.original.title}
        </span>
      ),
    },
    {
      accessorKey: "component",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 text-xs font-semibold"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Component
          <ArrowUpDown className="ml-1.5 h-3 w-3" />
        </Button>
      ),
      size: 140,
      cell: ({ row }) => (
        <ComponentBadge component={row.original.component} />
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground truncate block max-w-[250px]">
          {row.original.description || "—"}
        </span>
      ),
    },
    {
      accessorKey: "code",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 text-xs font-semibold"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Code
          <ArrowUpDown className="ml-1.5 h-3 w-3" />
        </Button>
      ),
      size: 140,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.code || "—"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 text-xs font-semibold"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ArrowUpDown className="ml-1.5 h-3 w-3" />
        </Button>
      ),
      size: 110,
      cell: ({ row }) => (
        <div className="text-center">
          <StatusBadge status={row.original.status} />
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <span className="text-xs font-semibold">Actions</span>,
      size: 100,
      enableSorting: false,
      cell: ({ row }) => {
        const r = row.original;
        if (r.component === "Communication") {
          return (
            <span className="text-[10px] text-muted-foreground italic">—</span>
          );
        }
        return (
          <div className="flex items-center justify-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              title="Preview checklist (SurveyJS UI)"
              onClick={() => handlers.onChecklistPreview(r)}
            >
              <ClipboardList className="h-3.5 w-3.5 text-violet-500" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              title="View raw JSON"
              onClick={() => handlers.onViewRawJson(r)}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      },
    },
  ];
}