'use client';

import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TablePagination } from '../tables/Pagination';
import { Skeleton } from '../ui/skeleton';
import ExportButtons from './ExportButtons';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  exportFilename?: string;
  /** Optional slot rendered at the right end of the search bar row */
  actions?: React.ReactNode;
}

export default function DataTable<TData, TValue>({
  columns,
  data,
  loading = false,
  exportFilename,
  actions,
}: DataTableProps<TData, TValue>) {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 8,
  });

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    state: {
      sorting,
      pagination,
      columnFilters,
      globalFilter,
    },
  });

  // Derive export data from the table's current filtered rows (all pages)
  const exportCols = columns.filter(
    (col) => 'accessorKey' in col && col.accessorKey,
  ) as (ColumnDef<TData, TValue> & { accessorKey: string })[];

  const exportHeaders = exportCols.map((col) =>
    typeof col.header === 'string' ? col.header : String(col.accessorKey).replace(/_/g, ' '),
  );

  const exportRows = table.getFilteredRowModel().rows.map((row) =>
    exportCols.map((col) => {
      const val = (row.original as Record<string, unknown>)[col.accessorKey];
      return val == null ? '' : String(val);
    }),
  );

  return (
    <div className="space-y-4">
      {/* Search bar row: input left, actions right, wraps on small screens */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder={t('systems.components.dataTable.searchPlaceholder')}
          value={globalFilter ?? ''}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="flex-1 min-w-[180px] max-w-sm"
        />
        {actions && (
          <div className="flex items-center gap-2 ml-auto">
            {actions}
          </div>
        )}
      </div>

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
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {columns.map((_, j) => (
                    <TableCell key={`skeleton-${i}-${j}`}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {t('systems.components.dataTable.noResults')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        {exportFilename && exportHeaders.length > 0 ? (
          <ExportButtons
            filename={exportFilename}
            headers={exportHeaders}
            rows={exportRows}
          />
        ) : (
          <div />
        )}
        <TablePagination table={table} />
      </div>
    </div>
  );
}
