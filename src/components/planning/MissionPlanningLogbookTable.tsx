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
import { getLogbookColumns } from "../tables/PlanningLogbookColumns";

interface MissionPlanningLogbookTableProps {
  data: PlanningLogbookRow[];
  openedRowId: number | null;
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
  onManage: (row: PlanningLogbookRow) => void;
}

export default function MissionPlanningLogbookTable({
  data,
  openedRowId,
  onOpen,
  onDelete,
  onManage,
}: MissionPlanningLogbookTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo(
    () => getLogbookColumns({ openedRowId, onOpen, onDelete, onManage }),
    [openedRowId, onOpen, onDelete, onManage]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-3">
      {/* Search + count */}
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search logbook..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <Badge variant="secondary">
          {table.getFilteredRowModel().rows.length} record
          {table.getFilteredRowModel().rows.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
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
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No mission planning logbook entries found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                const isOpened =
                  openedRowId === row.original.mission_planning_id;
                return (
                  <TableRow
                    key={row.id}
                    className={isOpened ? "bg-muted/50" : ""}
                    data-state={isOpened ? "selected" : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
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
    </div>
  );
}