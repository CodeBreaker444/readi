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
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { TablePagination } from '../tables/Pagination';
import { createMissionStatusColumns } from '../tables/StatusColumn';

interface MissionStatusTableProps {
  data: Mission[];
  onDelete: (id: number) => void;
  onEdit: (status: Mission) => void;
  isDark: boolean;
}

export default function MissionStatusTable({ data, onDelete, onEdit, isDark }: MissionStatusTableProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Mission | null>(null);

  const handleEditClick = (status: Mission) => {
    setEditingId(status.id);
    setEditForm({ ...status });
  };

  const handleSaveEdit = () => {
    if (editForm && editForm.code.trim() && editForm.name.trim()) {
      onEdit(editForm);
      setEditingId(null);
      setEditForm(null);
    } else {
      toast.error('Code and Name are required');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const columns = useMemo(
    () => createMissionStatusColumns({
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium">No mission statuses available</p>
                    <p className="text-sm mt-1">Add your first status to get started</p>
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