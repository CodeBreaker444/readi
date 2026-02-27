'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MissionResult } from '@/config/types/types';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { createMissionResultColumns } from '../tables/MissionResultColumn';
import { TablePagination } from '../tables/Pagination';

interface MissionResultTableProps {
  data: MissionResult[];
  onDelete: (id: number) => void;
  onEdit: (result: MissionResult) => void;
  isDark: boolean;
}

export default function MissionResultTable({ data, onDelete, onEdit, isDark }: MissionResultTableProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<MissionResult | null>(null);

  const handleEditClick = (result: MissionResult) => {
    setEditingId(result.id);
    setEditForm({ ...result });
  };

  const handleSaveEdit = () => {
    if (editForm && editForm.code.trim() && editForm.description.trim()) {
      onEdit(editForm);
      setEditingId(null);
      setEditForm(null);
    } else {
      toast.error('Code and Description are required');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const columns = useMemo(
    () => createMissionResultColumns({
      isDark,
      editingId,
      editForm,
      onEditChange: setEditForm,
      onEditClick: handleEditClick,
      onSave: handleSaveEdit,
      onCancel: handleCancelEdit,
      onDelete,
    }),
    [isDark, editingId, editForm, onDelete]
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
      <div className={`overflow-x-auto rounded-xl border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <Table>
          <TableHeader className={isDark ? 'bg-slate-700' : 'bg-gradient-to-r from-blue-50 to-indigo-50'}>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className={isDark ? 'border-slate-600 hover:bg-transparent' : 'hover:bg-transparent'}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className={isDark ? 'text-slate-300' : 'text-gray-700'}>
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
                  className={`transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-700/50' : 'hover:bg-gray-50'}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <div className={`text-center py-12 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                      <svg className="w-8 h-8 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium">No mission results available</p>
                    <p className="text-sm mt-1">Add your first result to get started</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination table={table} />
    </div>
  );
}