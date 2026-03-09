'use client';

import {
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  RowSelectionState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import axios from 'axios';
import { FileX2, Loader2, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TablePagination } from '../tables/Pagination';

import { Evaluation } from '@/config/types/evaluation';
import { cn } from '@/lib/utils';
import { getEvaluationColumns } from '../tables/EvaluationColumn';

export function EvaluationTable({ onView, isDark }: { onView?: (ev: Evaluation) => void; isDark?: boolean }) {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Evaluation | null>(null);

  const fetchEvaluations = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`/api/evaluation`);
      setEvaluations(res.data.data ?? []);
    } catch (err) {
      toast.error('Failed to load evaluations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvaluations();
  }, []);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await axios.delete(`/api/evaluation/${deleteTarget.evaluation_id}`);
      toast.success('Evaluation deleted');
      setDeleteTarget(null);
      fetchEvaluations();
    } catch (err) {
      toast.error('Delete failed');
    } finally {
      setIsDeleting(false);
    }
  }

  const columns = useMemo(() =>
    getEvaluationColumns(),
    [onView]);

  const table = useReactTable({
    data: evaluations,
    columns,
    state: { sorting, columnFilters, rowSelection, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  });

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="relative max-w-sm flex-1">
          <Search className={cn("absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5", isDark ? "text-slate-500" : "text-slate-400")} />
          <Input
            placeholder="Search evaluations…"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className={cn(
              "pl-8 h-8 text-sm transition-colors",
              isDark ? "bg-slate-900 border-slate-800 text-slate-200 placeholder:text-slate-600 focus:ring-slate-700" : "bg-white border-slate-200"
            )}
          />
        </div>
        <div className={cn("text-xs font-medium", isDark ? "text-slate-500" : "text-slate-400")}>
          {table.getFilteredRowModel().rows.length} records found
        </div>
      </div>

      <div className={cn(
        "rounded-md border overflow-x-auto transition-colors",
        isDark ? "border-slate-800 bg-slate-950/50" : "border-slate-200 bg-white"
      )}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className={cn("hover:bg-transparent border-b transition-colors", isDark ? "bg-slate-900/50 border-slate-800" : "bg-slate-50 border-slate-200")}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id} className={cn("text-xs font-semibold h-9 px-3", isDark ? "text-slate-400" : "text-slate-600")}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className={isDark ? "border-slate-800" : ""}>
                  {columns.map((_, j) => (
                    <TableCell key={j} className="px-3 py-2">
                      <Skeleton className={cn("h-4 w-full", isDark ? "bg-slate-800" : "bg-slate-100")} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-[300px] text-center">
                  <div className="flex flex-col items-center justify-center space-y-3 animate-in fade-in zoom-in duration-300">
                    <div className={cn("p-4 rounded-full", isDark ? "bg-slate-900" : "bg-slate-50")}>
                      <FileX2 className={cn("h-10 w-10", isDark ? "text-slate-700" : "text-slate-300")} />
                    </div>
                    <div className="space-y-1">
                      <p className={cn("text-sm font-medium", isDark ? "text-slate-300" : "text-slate-600")}>No evaluations found</p>
                      <p className={cn("text-xs", isDark ? "text-slate-500" : "text-slate-400")}>
                        {globalFilter ? "Try adjusting your search filters." : "Get started by creating a new evaluation."}
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    "transition-colors border-b",
                    isDark ? "border-slate-800 hover:bg-slate-900/50" : "border-slate-200 hover:bg-slate-50/50",
                    row.getIsSelected() && (isDark ? "bg-slate-800/80" : "bg-blue-50")
                  )}
                  onClick={() => row.toggleSelected()}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cn("px-3 py-2 text-sm", isDark ? "text-slate-300" : "text-slate-700")}>
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className={isDark ? "bg-slate-900 border-slate-800" : ""}>
          <AlertDialogHeader>
            <AlertDialogTitle className={isDark ? "text-slate-100" : ""}>Delete Evaluation?</AlertDialogTitle>
            <AlertDialogDescription className={isDark ? "text-slate-400" : ""}>
              Permanently delete <strong className={isDark ? "text-slate-200" : ""}>EVAL_{deleteTarget?.evaluation_id}</strong>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={isDark ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white" : ""}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}