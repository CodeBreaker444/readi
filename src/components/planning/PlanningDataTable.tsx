"use client";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import ExportButtons from "../system/ExportButtons";
import { TablePagination } from "../tables/Pagination";
import { TableSkeleton } from "./TableSkeleton";

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, any>[];
  loading?: boolean;
  isDark: boolean;
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
  selectedRowId?: number | null;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  emptyMessage?: string;
}

export default function PlanningDataTable<T extends { [key: string]: any }>({
  data,
  columns,
  loading = false,
  isDark,
  globalFilter = "",
  onGlobalFilterChange,
  selectedRowId,
  onRowClick,
  pageSize = 15,
  emptyMessage = "No records found",
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
   const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 25
    });

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, pagination},
    onSortingChange: setSorting,
    onGlobalFilterChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
     onPaginationChange: setPagination,
  });

  const borderColor = isDark ? "border-slate-700" : "border-slate-200";
  const theadBg = isDark ? "bg-slate-800/80" : "bg-slate-50/80";
  const hoverBg = isDark ? "hover:bg-slate-700/40" : "hover:bg-slate-50";
  const textMuted = isDark ? "text-slate-400" : "text-slate-500";
 

  return (
    <div className="space-y-0">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="min-w-max">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow
                  key={hg.id}
                  className={cn("border-y", borderColor, theadBg)}
                >
                  {hg.headers.map((header) => {
                    const sorted = header.column.getIsSorted();
                    return (
                      <TableHead
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        className={cn(
                          "px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap",
                          textMuted
                        )}
                        style={{ width: header.getSize() }}
                      >
                        <div className="flex items-center gap-1">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {sorted === "asc" ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : sorted === "desc" ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronsUpDown className="w-3 h-3 opacity-30" />
                          )}
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableSkeleton columns={columns.length} isDark={isDark} />
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className={cn("text-center py-16 text-sm", textMuted)}
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => {
                  const isSelected = selectedRowId != null && (row.original as any).planning_id === selectedRowId;
                  return (
                    <TableRow
                      key={row.id}
                      onClick={() => onRowClick?.(row.original)}
                      className={cn(
                        "cursor-pointer transition-colors duration-150",
                        borderColor,
                        isDark ? "hover:bg-slate-700/40" : "hover:bg-slate-50",
                        isSelected && "bg-violet-500/10 border-l-2 border-l-violet-500"
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="px-3 py-2.5 text-xs">
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
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

     {!loading && (
       <div className="flex items-center justify-between px-2">
         <ExportButtons
           filename="Planning"
           headers={table.getFlatHeaders().filter(h => (h.column.columnDef as any).accessorKey).map(h => String(h.column.columnDef.header ?? (h.column.columnDef as any).accessorKey))}
           rows={table.getFilteredRowModel().rows.map(row => table.getFlatHeaders().filter(h => (h.column.columnDef as any).accessorKey).map(h => { const val = (row.original as any)[(h.column.columnDef as any).accessorKey]; return val == null ? '' : String(val); }))}
         />
         <TablePagination table={table} />
       </div>
     )}
    </div>
  );
}