'use client';

import { Operation } from '@/app/missions/table/page';
import { getOperationColumns } from '@/components/tables/OperationColumn';
import { TablePagination } from '@/components/tables/Pagination';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Table as ReactTable, flexRender } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function SortIndicator({ isSorted }: { isSorted: false | 'asc' | 'desc' }) {
  if (!isSorted)
    return <ArrowUpDown className="ml-1 inline h-3 w-3 text-muted-foreground/40" />;
  return isSorted === 'asc'
    ? <ArrowUp className="ml-1 inline h-3 w-3" />
    : <ArrowDown className="ml-1 inline h-3 w-3" />;
}

interface OperationsTableProps {
  isDark: boolean;
  loading: boolean;
  table: ReactTable<Operation>;
}

export function OperationsTable({ isDark, loading, table }: OperationsTableProps) {
  const { t } = useTranslation();

  return (
    <div className="mx-auto px-6 py-4">
      <div
        className={`rounded-lg border shadow-sm overflow-hidden ${
          isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
        }`}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className={
                  isDark
                    ? 'bg-slate-800/80 hover:bg-slate-800/80 border-slate-700'
                    : 'bg-muted/40 hover:bg-muted/40'
                }
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      'whitespace-nowrap',
                      header.column.getCanSort() && 'cursor-pointer select-none'
                    )}
                    style={{
                      width: header.getSize() !== 150 ? header.getSize() : undefined,
                    }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanSort() && (
                      <SortIndicator isSorted={header.column.getIsSorted()} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[180px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Skeleton className="h-7 w-7 rounded-md" />
                      <Skeleton className="h-7 w-7 rounded-md" />
                      <Skeleton className="h-7 w-7 rounded-md" />
                      <Skeleton className="h-7 w-7 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={getOperationColumns(t).length}
                  className="py-16 text-center text-muted-foreground"
                >
                  <Wrench className="mx-auto mb-2 h-8 w-8 opacity-25" />
                  <p className="text-sm">{t('operations.table.empty')}</p>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={`group ${
                    isDark
                      ? 'border-slate-700/60 hover:bg-slate-800/50'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
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
