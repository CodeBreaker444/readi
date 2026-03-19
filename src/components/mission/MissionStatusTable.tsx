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
              table.getRowModel().rows.map((row, idx) => (
                <TableRow
                  key={row.id}
                  className={`group transition-colors border-b ${
                    isDark
                      ? 'border-white/[0.04] hover:bg-white/[0.03]'
                      : 'border-gray-50 hover:bg-gray-50/50'
                  } ${editingId === row.original.id
                    ? isDark
                      ? 'bg-cyan-500/[0.04] hover:bg-cyan-500/[0.06]'
                      : 'bg-blue-50/50 hover:bg-blue-50/70'
                    : ''
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
                      No statuses defined yet
                    </p>
                    <p className={`text-[11px] mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                      Create your first status to start tracking missions
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {table.getRowModel().rows.length > 0 && (
        <div className={`border-t ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
          <TablePagination table={table} />
        </div>
      )}
    </div>
  );
}