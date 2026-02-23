"use client";

import { Communication } from "@/config/types/communication";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import { getCommunicationColumns } from "../tables/CommunicationColumn";
import { TablePagination } from "../tables/Pagination";

interface CommunicationTableProps {
  data: Communication[];
  onEdit: (communication: Communication) => void;
  onDelete: (communicationId: number) => void;
  loading: boolean;
  isDark: boolean;
}

export function CommunicationTable({
  data,
  onEdit,
  onDelete,
  loading,
  isDark,
}: CommunicationTableProps) {
  const [globalFilter, setGlobalFilter] = useState("");
  const columns = getCommunicationColumns(isDark, onEdit, onDelete);

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div className="space-y-4">
      <div
        className={`overflow-x-auto rounded-2xl border transition-all ${
          isDark
            ? "bg-[#0c0f1a] border-slate-800"
            : "bg-white border-slate-200 shadow-sm"
        }`}
      >
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className={`border-b ${
                  isDark
                    ? "border-slate-800 bg-slate-800/30 text-slate-500"
                    : "border-slate-100 bg-slate-50 text-slate-400"
                }`}
              >
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-4 text-left text-[10px] font-bold uppercase tracking-[0.2em] font-mono"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody
            className={`divide-y ${
              isDark ? "divide-slate-800/50" : "divide-slate-100"
            }`}
          >
            {loading ? (
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <tr key={`skeleton-row-${rowIndex}`}>
                  {Array.from({ length: columns.length }).map((_, cellIndex) => (
                    <td key={`skeleton-cell-${cellIndex}`} className="px-4 py-4">
                      <div
                        className={`h-4 rounded animate-pulse ${
                          isDark ? "bg-slate-800" : "bg-slate-200"
                        }`}
                        style={{
                          width:
                            cellIndex === 0
                              ? "20px"
                              : cellIndex === 1
                              ? "100px"
                              : "70%",
                          opacity: 1 - cellIndex * 0.1,
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`transition-colors ${
                    isDark
                      ? "hover:bg-blue-500/2"
                      : "hover:bg-slate-50"
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-20 text-center text-slate-500 font-mono text-xs uppercase tracking-widest italic"
                >
                  No active protocols found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <TablePagination table={table} />
    </div>
  );
}