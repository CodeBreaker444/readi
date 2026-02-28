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
        className={`rounded-xl border overflow-hidden shadow-sm ${
          isDark ? "bg-gray-900 border-gray-700/60" : "bg-white border-gray-200"
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead
              className={`border-b ${
                isDark
                  ? "bg-gray-800/60 border-gray-700/60"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider ${
                        isDark ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody
              className={`divide-y ${
                isDark ? "divide-gray-700/60" : "divide-gray-100"
              }`}
            >
              {loading ? (
                Array.from({ length: 5 }).map((_, rowIndex) => (
                  <tr
                    key={`skeleton-row-${rowIndex}`}
                    className={isDark ? "bg-gray-900" : "bg-white"}
                  >
                    {Array.from({ length: columns.length }).map((_, cellIndex) => (
                      <td
                        key={`skeleton-cell-${cellIndex}`}
                        className="px-4 py-3.5"
                      >
                        <div
                          className={`h-3.5 rounded-full animate-pulse ${
                            isDark ? "bg-gray-800" : "bg-gray-100"
                          }`}
                          style={{
                            width:
                              cellIndex === 0
                                ? "24px"
                                : cellIndex === 1
                                ? "90px"
                                : "65%",
                            opacity: 1 - rowIndex * 0.15,
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
                        ? "bg-gray-900 hover:bg-gray-800/50"
                        : "bg-white hover:bg-gray-50/70"
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          isDark ? "bg-gray-800" : "bg-gray-100"
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className={`w-5 h-5 ${isDark ? "text-gray-600" : "text-gray-400"}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            isDark ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          No protocols found
                        </p>
                        <p
                          className={`text-xs mt-0.5 ${
                            isDark ? "text-gray-600" : "text-gray-400"
                          }`}
                        >
                          Initialize a new protocol to get started
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TablePagination table={table} />
    </div>
  );
}