'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Mission } from '@/config/types/types';
import { ColumnDef } from '@tanstack/react-table';
import { Check, Pencil, Trash2, X } from 'lucide-react';

interface GetStatusColumnsOptions {
  isDark: boolean;
  editingId: number | null;
  editForm: Mission | null;
  onEditChange: (form: Mission) => void;
  onEditClick: (status: Mission) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (id: number) => void;
}

export function createMissionStatusColumns({
  isDark,
  editingId,
  editForm,
  onEditChange,
  onEditClick,
  onSave,
  onCancel,
  onDelete,
}: GetStatusColumnsOptions): ColumnDef<Mission>[] {
  const inputClass = isDark
    ? 'bg-gray-900 border-gray-600 text-gray-100 focus-visible:ring-blue-500 h-8 text-sm'
    : 'bg-white border-gray-300 text-gray-800 focus-visible:ring-blue-400 h-8 text-sm';

  const headerClass = `text-[11px] font-semibold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-400'}`;

  return [
    {
      accessorKey: 'id',
      header: () => <span className={headerClass}>#</span>,
      cell: ({ row }) => (
        <span className={`text-xs font-mono px-2 py-0.5 rounded-md ${isDark ? 'bg-gray-800 text-gray-400' : ' text-black'}`}>
          {String(row.original.id).padStart(3, '0')}
        </span>
      ),
    },
    {
      accessorKey: 'code',
      header: () => <span className={headerClass}>Code</span>,
      cell: ({ row }) => {
        const status = row.original;
        if (editingId === status.id && editForm) {
          return (
            <Input
              required
              maxLength={50}
              value={editForm.code}
              onChange={(e) => onEditChange({ ...editForm, code: e.target.value.toUpperCase() })}
              className={`uppercase ${inputClass}`}
            />
          );
        }
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
            {status.code}
          </span>
        );
      },
    },
    {
      accessorKey: 'name',
      header: () => <span className={headerClass}>Name</span>,
      cell: ({ row }) => {
        const status = row.original;
        if (editingId === status.id && editForm) {
          return (
            <Input
              required
              maxLength={100}
              value={editForm.name}
              onChange={(e) => onEditChange({ ...editForm, name: e.target.value })}
              className={inputClass}
            />
          );
        }
        return (
          <span className={`text-sm font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
            {status.name}
          </span>
        );
      },
    },
    {
      accessorKey: 'description',
      header: () => <span className={headerClass}>Description</span>,
      cell: ({ row }) => {
        const status = row.original;
        if (editingId === status.id && editForm) {
          return (
            <Input
              value={editForm.description || ''}
              onChange={(e) => onEditChange({ ...editForm, description: e.target.value })}
              className={inputClass}
            />
          );
        }
        return (
          <span className={`text-sm truncate max-w-[200px] block ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {status.description || <span className="opacity-30 italic">—</span>}
          </span>
        );
      },
    },
    {
      accessorKey: 'order',
      header: () => <span className={headerClass}>Order</span>,
      cell: ({ row }) => {
        const status = row.original;
        if (editingId === status.id && editForm) {
          return (
            <Input
              type="number"
              min="0"
              value={editForm.order || 0}
              onChange={(e) => onEditChange({ ...editForm, order: parseInt(e.target.value) || 0 })}
              className={`w-20 ${inputClass}`}
            />
          );
        }
        return (
          <span className={`text-xs font-mono px-2 py-0.5 rounded-md ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
            {status.order ?? '—'}
          </span>
        );
      },
    },
    {
      accessorKey: 'isFinalStatus',
      header: () => <span className={`${headerClass} flex justify-center`}>Final</span>,
      cell: ({ row }) => {
        const status = row.original;
        if (editingId === status.id && editForm) {
          return (
            <div className="flex justify-center">
              <Checkbox
                checked={editForm.isFinalStatus || false}
                onCheckedChange={(checked) => onEditChange({ ...editForm, isFinalStatus: !!checked })}
              />
            </div>
          );
        }
        return (
          <div className="flex justify-center">
            {status.isFinalStatus ? (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                isDark
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-200'
              }`}>
                Yes
              </span>
            ) : (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                isDark
                  ? 'bg-gray-800 text-gray-500 border-gray-700'
                  : 'bg-gray-100 text-gray-400 border-gray-200'
              }`}>
                No
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: () => <div className={`${headerClass} flex justify-end`}>Actions</div>,
      cell: ({ row }) => {
        const status = row.original;
        const isEditing = editingId === status.id && editForm;

        return (
          <TooltipProvider delayDuration={100}>
            <div className="flex items-center justify-end gap-1">
              {isEditing ? (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={onSave}
                        className={`p-1.5 rounded-lg transition-all duration-150 ${
                          isDark
                            ? 'bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 hover:text-emerald-300 border border-emerald-700/40 hover:border-emerald-500/60'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 border border-emerald-200 hover:border-emerald-300'
                        }`}
                      >
                        <Check size={15} strokeWidth={2.5} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">Save changes</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={onCancel}
                        className={`p-1.5 rounded-lg transition-all duration-150 ${
                          isDark
                            ? 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-400 hover:text-gray-200 border border-gray-600/40 hover:border-gray-500/60'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <X size={15} strokeWidth={2.5} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">Cancel</TooltipContent>
                  </Tooltip>
                </>
              ) : (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onEditClick(status)}
                        className={`p-1.5 rounded-lg transition-all duration-150 ${
                          isDark
                            ? 'bg-indigo-500/10 hover:bg-indigo-500/25 text-indigo-400 hover:text-indigo-300 border border-indigo-700/40 hover:border-indigo-500/60'
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-500 hover:text-indigo-700 border border-indigo-200 hover:border-indigo-300'
                        }`}
                      >
                        <Pencil size={14} strokeWidth={2} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">Edit</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onDelete(status.id)}
                        className={`p-1.5 rounded-lg transition-all duration-150 ${
                          isDark
                            ? 'bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 border border-rose-700/40 hover:border-rose-500/60'
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-500 hover:text-rose-600 border border-rose-200 hover:border-rose-300'
                        }`}
                      >
                        <Trash2 size={14} strokeWidth={2} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">Delete</TooltipContent>
                  </Tooltip>
                </>
              )}
            </div>
          </TooltipProvider>
        );
      },
    },
  ];
}