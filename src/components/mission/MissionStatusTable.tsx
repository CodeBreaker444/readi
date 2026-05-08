'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Mission } from '@/config/types/types';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ClipboardList } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ExportButtons from '../system/ExportButtons';
import { TablePagination } from '../tables/Pagination';
import { createMissionStatusColumns } from '../tables/StatusColumn';

interface MissionStatusTableProps {
  data: Mission[];
  onDelete: (id: number) => void;
  onEdit: (status: Mission) => void;
  isDark: boolean;
}

export default function MissionStatusTable({ data, onDelete, onEdit, isDark }: MissionStatusTableProps) {
  const { t } = useTranslation();
  const columns = useMemo(
    () => createMissionStatusColumns({ isDark, onEditClick: onEdit, onDelete, t }),
    [isDark, onEdit, onDelete, t]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  });

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className={`border-b ${
                  isDark
                    ? 'border-white/[0.06] hover:bg-transparent'
                    : 'border-gray-100 hover:bg-transparent'
                }`}
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={`h-10 px-5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                      isDark ? 'text-gray-500 bg-white/[0.02]' : 'text-gray-400 bg-gray-50/60'
                    }`}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={`group transition-colors border-b ${
                    isDark
                      ? 'border-white/[0.04] hover:bg-white/[0.03]'
                      : 'border-gray-50 hover:bg-gray-50/50'
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-5 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <div className={`flex flex-col items-center justify-center py-20 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    <div className={`flex items-center justify-center w-12 h-12 rounded-xl mb-4 ${
                      isDark ? 'bg-white/[0.04] ring-1 ring-white/[0.06]' : 'bg-gray-100 ring-1 ring-gray-200/60'
                    }`}>
                      <ClipboardList size={20} className="opacity-50" />
                    </div>
                    <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {t('missionStatus.table.emptyTitle')}
                    </p>
                    <p className={`text-[11px] mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                      {t('missionStatus.table.emptySubtitle')}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className={`border-t flex items-center justify-between px-3 ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
        <ExportButtons
          filename={t('missionStatus.table.exportFilename')}
          headers={['ID', t('missionStatus.table.colCode'), t('missionStatus.table.colDescription')]}
          rows={data.map(d => [d.id, d.code, d.description])}
        />
        <TablePagination table={table} />
      </div>
    </div>
  );
}
