'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MissionCategory } from '@/config/types/types';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
import { toast } from 'sonner';
import { getMissionCategoryColumns } from '../tables/MissionCategoryColumn';
import { TablePagination } from '../tables/Pagination';

interface MissionCategoryTableProps {
  data: MissionCategory[];
  onDelete: (id: number) => void;
  onEdit: (category: MissionCategory) => void;
  isDark: boolean;
}

export default function MissionCategoryTable({ data, onDelete, onEdit, isDark }: MissionCategoryTableProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<MissionCategory | null>(null);

  const handleEditClick = (category: MissionCategory) => {
    setEditingId(category.id);
    setEditForm({ ...category });
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

  const columns = getMissionCategoryColumns({
    isDark,
    editingId,
    editForm,
    onEditChange: setEditForm,
    onEditClick: handleEditClick,
    onSave: handleSaveEdit,
    onCancel: handleCancelEdit,
    onDelete,
  });

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="w-full">
      <div className={`overflow-hidden rounded-xl border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <Table>
          <TableHeader className={isDark ? 'bg-slate-700' : 'bg-gradient-to-r from-blue-50 to-indigo-50'}>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className={isDark ? 'border-slate-600 hover:bg-transparent' : 'hover:bg-transparent'}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-gray-700'}`}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody className={isDark ? 'divide-y divide-slate-700' : ''}>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={`transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-700' : 'hover:bg-gray-50'}`}
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium">No mission categories available</p>
                    <p className="text-sm mt-1">Add your first category to get started</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination table={table} />
      </div>
    </div>
  );
}