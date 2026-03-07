"use client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlanningLogbookRow } from "@/config/types/evaluation-planning";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { TablePagination } from "../tables/Pagination";
import { getLogbookColumns } from "../tables/PlanningLogbookColumns";

interface MissionPlanningLogbookTableProps {
  isDark: boolean;
  data: PlanningLogbookRow[];
  openedRowId: number | null;
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
  onManage: (row: PlanningLogbookRow) => void;
  onTestLogbook?: (row: PlanningLogbookRow) => void;
}

export default function MissionPlanningLogbookTable({
  isDark,
  data,
  openedRowId,
  onOpen,
  onDelete,
  onManage,
  onTestLogbook,
}: MissionPlanningLogbookTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo(
    () => getLogbookColumns({ openedRowId, onOpen, onDelete, onManage, onTestLogbook }),
    [openedRowId, onOpen, onDelete, onManage, onTestLogbook]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

 return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search logbook..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className={`max-w-sm ${
            isDark 
              ? "bg-slate-950 border-slate-800 text-white placeholder:text-slate-100" 
              : "bg-white"
          }`}
        />
        <Badge 
          variant="secondary" 
          className={isDark ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : ""}
        >
          {table.getFilteredRowModel().rows.length} record
          {table.getFilteredRowModel().rows.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className={`rounded-md border ${isDark ? "border-slate-800" : "border-slate-200"}`}>
        <Table>
          <TableHeader className={isDark ? "bg-slate-900/50" : "bg-slate-50/50"}>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className={isDark ? "border-slate-800 hover:bg-transparent" : ""}>
                {headerGroup.headers.map((header) => (
                  <TableHead 
                    key={header.id} 
                    className={isDark ? "text-slate-400 font-medium" : "text-slate-600"}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow className={isDark ? "border-slate-800" : ""}>
                <TableCell
                  colSpan={columns.length}
                  className={`h-24 text-center ${isDark ? "text-slate-500" : "text-muted-foreground"}`}
                >
                  No mission planning logbook entries found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                const isOpened = openedRowId === row.original.mission_planning_id;
                return (
                  <TableRow
                    key={row.id}
                    className={`
                      ${isDark ? "border-slate-800 hover:bg-slate-800/50" : "hover:bg-slate-50"}
                      ${isOpened && isDark ? "bg-slate-800/80 data-[state=selected]:bg-slate-800/80" : ""}
                      ${isOpened && !isDark ? "bg-muted/50" : ""}
                    `}
                    data-state={isOpened ? "selected" : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className={isDark ? "text-slate-300" : ""}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      
      <TablePagination table={table}/>
    </div>
  );
}