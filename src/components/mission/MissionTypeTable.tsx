'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MissionType } from '@/config/types/types';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
import { getMissionTypeColumns } from '../tables/MissionTypeColumn';
import { TablePagination } from '../tables/Pagination';

interface MissionTypeTableProps {
  data: MissionType[];
  onDelete: (id: number) => void;
  onEdit: (type: MissionType) => void;
  isDark: boolean;
}

export default function MissionTypeTable({ data, onDelete, onEdit, isDark }: MissionTypeTableProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<MissionType | null>(null);

  const handleEditClick = (type: MissionType) => {
    setEditingId(type.id);
    setEditForm({ ...type });
  };

  const handleSaveEdit = () => {
    if (editForm) {
      onEdit(editForm);
      setEditingId(null);
      setEditForm(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const columns = getMissionTypeColumns({
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
    <div className="overflow-hidden rounded-lg">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow
                key={headerGroup.id}
                className={`border-b ${isDark ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800/50' : 'bg-gray-50 border-gray-200 hover:bg-gray-50'}`}
              >
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    className={`text-xs font-bold uppercase tracking-wider whitespace-nowrap ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  className={`transition-all duration-200 ${isDark ? 'border-gray-700 hover:bg-gray-800/50' : 'hover:bg-indigo-50/30'}`}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <div className="text-center py-12 px-4">
                    <div className={`inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full mb-4 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                      <svg className={`w-8 h-8 sm:w-10 sm:h-10 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className={`text-base sm:text-lg font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      No mission types available
                    </p>
                    <p className={`text-xs sm:text-sm mt-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                      Add your first mission type to get started
                    </p>
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