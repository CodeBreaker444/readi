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
import { MissionPlanningLogbookItem } from "@/config/types/logbook";
import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    type ColumnFiltersState,
    type SortingState
} from "@tanstack/react-table";
import {
    CheckCircle2,
    ChevronDown,
    ChevronsUpDown,
    ChevronUp,
    FilterX,
    XCircle
} from "lucide-react";
import { useMemo, useState } from "react";
import { getColumns } from "../tables/LogbookColumn";
import { TablePagination } from "../tables/Pagination";
import { Skeleton } from "../ui/skeleton";

interface LogbookTableProps {
    data: MissionPlanningLogbookItem[];
    loading: boolean;
}

export function ActiveBadge({ active }: { active: string }) {
    const isActive = active === "Y";
    return (
        <Badge
            variant="outline"
            className={
                isActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-rose-200 bg-rose-50 text-rose-600"
            }
        >
            {isActive ? (
                <CheckCircle2 className="mr-1 h-3 w-3" />
            ) : (
                <XCircle className="mr-1 h-3 w-3" />
            )}
            {isActive ? "Active" : "Inactive"}
        </Badge>
    );
}



export function MissionLogbookTable({ data, loading, isDark }: LogbookTableProps & { isDark: boolean }) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState("");
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 25
    });

    const columns = useMemo(() => getColumns(isDark), [isDark]);
    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            columnFilters,
            globalFilter,
            pagination
        },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,
        onPaginationChange: setPagination,

        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });
    return (
        <div className="space-y-3">
            <div className="flex items-end justify-end p-3 gap-3">
                <Input
                    placeholder="Search across all columns…"
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className={`h-8 max-w-xs text-sm transition-colors ${isDark
                            ? "border-slate-700 bg-slate-900 text-slate-200 placeholder:text-slate-500 focus-visible:ring-blue-500/20"
                            : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-200"
                        }`}
                />
            </div>

            <div className={`overflow-hidden rounded-xl border transition-all ${isDark ? "border-slate-800 bg-slate-900 shadow-2xl" : "border-slate-200 bg-white shadow-sm"
                }`}>
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((hg) => (
                            <TableRow
                                key={hg.id}
                                className={`border-b transition-colors hover:bg-transparent ${isDark ? "border-slate-800 bg-slate-800/50" : "border-slate-200 bg-slate-50"
                                    }`}
                            >
                                {hg.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        style={{ width: header.getSize() }}
                                        className={`py-2.5 text-xs font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"
                                            }`}
                                    >
                                        {header.isPlaceholder ? null : (
                                            <button
                                                className={`flex items-center gap-1 transition-colors ${isDark ? "hover:text-slate-200" : "hover:text-slate-800"
                                                    }`}
                                                onClick={header.column.getToggleSortingHandler()}
                                                disabled={!header.column.getCanSort()}
                                            >
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                {header.column.getCanSort() && (
                                                    <span className={isDark ? "text-slate-600" : "text-slate-400"}>
                                                        {header.column.getIsSorted() === "asc" ? (
                                                            <ChevronUp className="h-3 w-3 text-blue-500" />
                                                        ) : header.column.getIsSorted() === "desc" ? (
                                                            <ChevronDown className="h-3 w-3 text-blue-500" />
                                                        ) : (
                                                            <ChevronsUpDown className="h-3 w-3 opacity-50" />
                                                        )}
                                                    </span>
                                                )}
                                            </button>
                                        )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 10 }).map((_, i) => (
                                <TableRow key={i} className={isDark ? "border-slate-800" : "border-slate-100"}>
                                    {columns.map((_, j) => (
                                        <TableCell key={j} className="py-3">
                                            <Skeleton className={`h-4 w-full rounded ${isDark ? "bg-slate-800" : "bg-slate-100"
                                                }`} />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : table.getRowModel().rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="py-20 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <FilterX className={`h-10 w-10 opacity-20 ${isDark ? "text-slate-400" : "text-slate-700"}`} />
                                        <p className={`text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>No mission plans found</p>
                                        <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>Try adjusting your filters and searching again</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    className={`cursor-default border-b transition-colors ${isDark
                                            ? "border-slate-800 hover:bg-slate-800/40"
                                            : "border-slate-100 hover:bg-slate-50/70"
                                        }`}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className={`py-3 text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <TablePagination table={table} />
        </div>
    );
}