"use client";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { OperationLogbookItem } from "@/config/types/logbook";
import {
    ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
 
import { cn } from "@/lib/utils";
import {
    Search,
} from "lucide-react";
import { MdOutlineFlight } from "react-icons/md";
import { operationLogbookColumns } from "../tables/OperationLogbookColumn";
import { TablePagination } from "../tables/Pagination";

const SKELETON_COL_WIDTHS = [60, 110, 110, 150, 140, 120, 120, 140, 110, 100, 150, 80, 90, 180];
const SKELETON_ROWS = 10;

interface OperationLogbookTableProps {
  data: OperationLogbookItem[];
  loading: boolean;
  isDark: boolean;
}

export function OperationLogbookTable({ data, loading, isDark }: OperationLogbookTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns: operationLogbookColumns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-colors ${
        isDark
          ? "border-slate-800 bg-slate-900/60 backdrop-blur-sm"
          : "border-slate-200 bg-white shadow-sm"
      }`}
    >
      <div
        className={`flex items-center justify-between gap-4 px-4 py-3 border-b ${
          isDark ? "border-slate-800" : "border-slate-200"
        }`}
      >
        <div className="flex items-center gap-2">
          {loading ? (
            <Skeleton className={`h-4 w-28 ${isDark ? "bg-slate-800" : "bg-slate-200"}`} />
          ) : (
            <span className="text-xs">
              <span className={`font-semibold ${isDark ? "text-white" : "text-slate-800"}`}>
                {table.getFilteredRowModel().rows.length}
              </span>
              <span className={isDark ? "text-slate-500" : "text-slate-400"}>
                {" "}flights found
              </span>
            </span>
          )}
        </div>

        <div className="relative w-56">
          <Search
            className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${
              isDark ? "text-slate-500" : "text-slate-400"
            }`}
          />
          <Input
            placeholder="Search table…"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            disabled={loading}
            className={`h-7 pl-8 text-xs ${
              isDark
                ? "bg-slate-800 border-slate-700 text-slate-300 placeholder:text-slate-600 focus:border-violet-500"
                : "bg-slate-50 border-slate-200 text-slate-700 placeholder:text-slate-400 focus:border-violet-400"
            }`}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr
                key={hg.id}
                className={`border-b ${isDark ? "border-slate-800" : "border-slate-200"}`}
              >
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className={`px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap ${
                      isDark ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: SKELETON_ROWS }).map((_, rowIdx) => (
                <tr
                  key={`skel-${rowIdx}`}
                  className={cn(
                    "border-b",
                    isDark ? "border-slate-800/70" : "border-slate-100",
                    isDark
                      ? rowIdx % 2 !== 0 && "bg-slate-900/30"
                      : rowIdx % 2 !== 0 && "bg-slate-50/60"
                  )}
                >
                  {SKELETON_COL_WIDTHS.map((colW, colIdx) => {
                    const skBase = isDark ? "bg-slate-800" : "bg-slate-200";
                    const skFaint = isDark ? "bg-slate-800/60" : "bg-slate-100";
                    const ratio = 0.5 + ((rowIdx * 3 + colIdx * 7) % 30) / 100;

                    const isDouble = [1, 2, 7, 10].includes(colIdx);
                    const isBadge = [5, 6, 8, 9].includes(colIdx);

                    return (
                      <td key={colIdx} className="px-3 py-3 align-middle">
                        {isDouble ? (
                          <div className="flex flex-col gap-1.5">
                            <Skeleton
                              className={`h-3 rounded ${skBase}`}
                              style={{ width: Math.round(colW * 0.7) }}
                            />
                            <Skeleton
                              className={`h-2.5 rounded ${skFaint}`}
                              style={{ width: Math.round(colW * 0.45) }}
                            />
                          </div>
                        ) : isBadge ? (
                          <Skeleton
                            className={`h-5 rounded-full ${skBase}`}
                            style={{ width: Math.round(colW * 0.65) }}
                          />
                        ) : (
                          <Skeleton
                            className={`h-3 rounded ${skBase}`}
                            style={{ width: Math.round(colW * ratio) }}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={operationLogbookColumns.length} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <MdOutlineFlight  className={`${isDark ? "text-slate-500" : "text-slate-400"}`}/>
                    <span className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                      No flights found
                    </span>
                    <span className={`text-[11px] ${isDark ? "text-slate-600" : "text-slate-300"}`}>
                      Adjust filters and search again
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, i) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b transition-colors",
                    isDark
                      ? "border-slate-800/70 hover:bg-slate-800/40"
                      : "border-slate-100 hover:bg-slate-50",
                    isDark
                      ? i % 2 !== 0 && "bg-slate-900/30"
                      : i % 2 !== 0 && "bg-slate-50/60"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2.5 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <TablePagination table={table}   />
    </div>
  );
}