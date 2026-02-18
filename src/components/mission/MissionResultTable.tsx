'use client';

import { MissionResult } from '@/config/types/types';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Check, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { TablePagination } from '../tables/Pagination';
import { createMissionResultColumns } from './missionResultColumns';

interface MissionResultTableProps {
  data: MissionResult[];
  onDelete: (id: number) => void;
  onEdit: (result: MissionResult) => void;
  isDark: boolean;
}

export default function MissionResultTable({ data, onDelete, onEdit, isDark }: MissionResultTableProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<MissionResult | null>(null);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 8,
  });

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
    () => createMissionResultColumns(isDark, handleEditClick, onDelete),
    [isDark, onDelete]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="w-full">
      <div className={`overflow-x-auto rounded-md shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <table className="w-full">
          <thead className={isDark ? 'bg-slate-700' : 'bg-linear-to-r from-blue-50 to-indigo-50'}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-gray-700'}`}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody className={isDark ? 'divide-y divide-slate-700' : 'divide-y divide-gray-100'}>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={`${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-50'} transition-colors`}
              >
                {editingId === row.original.id && editForm ? (
                  <>
                    <td className={`px-6 py-4 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {row.original.id}
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        required
                        maxLength={50}
                        className={`w-full px-3 py-2 rounded-lg border outline-none transition-all ${isDark
                            ? 'bg-slate-900 border-slate-600 text-white focus:ring-blue-500'
                            : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                          } focus:ring-2 focus:border-transparent`}
                        value={editForm.code}
                        onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <textarea
                        required
                        maxLength={255}
                        rows={2}
                        className={`w-full px-3 py-2 rounded-lg border outline-none transition-all ${isDark
                            ? 'bg-slate-900 border-slate-600 text-white focus:ring-blue-500'
                            : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                          } focus:ring-2 focus:border-transparent`}
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                          onClick={handleSaveEdit}
                        >
                          <Check size={16} /> Save
                        </button>
                        <button
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                          onClick={handleCancelEdit}
                        >
                          <X size={16} /> Cancel
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {data.length === 0 && (
          <div className={`text-center py-12 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
              <svg className="w-8 h-8 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-lg font-medium">No mission results available</p>
            <p className="text-sm mt-1">Add your first result to get started</p>
          </div>
        )}
      </div>

      <TablePagination table={table} />
    </div>
  );
}