"use client";

import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Planning } from "@/config/types/evaluation-planning";
import { cn } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";
import { Search } from "lucide-react";
import PlanningDataTable from "./PlanningDataTable";

interface PlanningTableCardProps {
  data: Planning[];
  columns: ColumnDef<Planning, any>[];
  loading: boolean;
  isDark: boolean;
  globalFilter: string;
  onGlobalFilterChange: (v: string) => void;
  selectedRowId: number | null;
  onRowClick: (row: Planning) => void;
}

export default function PlanningTableCard({
  data,
  columns,
  loading,
  isDark,
  globalFilter,
  onGlobalFilterChange,
  selectedRowId,
  onRowClick,
}: PlanningTableCardProps) {
  const textMuted = isDark ? "text-slate-400" : "text-slate-500";

  return (
    <Card
      className={cn(
        "overflow-hidden",
        isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
      )}
    >
      <CardHeader className="px-5 py-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h2
              className={cn(
                "text-sm font-semibold",
                isDark ? "text-white" : "text-slate-900"
              )}
            >
              Planning — Operational Scenario Request Logbook
            </h2>
            <p className={cn("text-xs mt-0.5", textMuted)}>
              Log of Operational Scenario Requests
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search
                className={cn(
                  "absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none",
                  textMuted
                )}
              />
              <Input
                type="text"
                placeholder="Search planning..."
                value={globalFilter}
                onChange={(e) => onGlobalFilterChange(e.target.value)}
                className={cn(
                  "pl-8 h-8 text-xs w-56",
                  isDark
                    ? "bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                )}
              />
            </div>

            <Badge
              variant="secondary"
              className={cn(
                "font-mono text-[11px] tabular-nums",
                isDark
                  ? "bg-slate-700 text-slate-400 hover:bg-slate-700"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-100"
              )}
            >
              {data.length} records
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <PlanningDataTable
          data={data}
          columns={columns}
          loading={loading}
          isDark={isDark}
          globalFilter={globalFilter}
          onGlobalFilterChange={onGlobalFilterChange}
          selectedRowId={selectedRowId}
          onRowClick={onRowClick}
          emptyMessage="No planning records found"
        />
      </CardContent>
    </Card>
  );
}