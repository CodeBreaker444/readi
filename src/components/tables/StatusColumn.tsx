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
    ? 'bg-white/[0.05] border-white/[0.1] text-gray-100 focus-visible:ring-cyan-500/40 focus-visible:border-cyan-500/40 h-8 text-xs rounded-lg placeholder:text-gray-600'
    : 'bg-white border-gray-200 text-gray-800 focus-visible:ring-blue-500/30 focus-visible:border-blue-300 h-8 text-xs rounded-lg placeholder:text-gray-300';

  return [
    {
      accessorKey: 'id',
      header: () => <span>#</span>,
      cell: ({ row }) => (
        <span className={`text-[11px] font-mono tabular-nums ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>
          {String(row.original.id).padStart(3, '0')}
        </span>
      ),
      size: 60,
    },
    {
      accessorKey: 'code',
      header: () => <span>Code</span>,
      cell: ({ row }) => {
        const status = row.original;
        if (editingId === status.id && editForm) {
          return (
            <Input
              required
              maxLength={50}
              value={editForm.code}
              onChange={(e) => onEditChange({ ...editForm, code: e.target.value.toUpperCase() })}
              className={`uppercase font-mono ${inputClass}`}
            />
          );
        }
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold tracking-wide ${
            isDark
              ? 'bg-white/[0.05] text-gray-300 ring-1 ring-white/[0.06]'
              : 'bg-gray-100 text-gray-600 ring-1 ring-gray-200/60'
          }`}>
            {status.code}
          </span>
        );
      },
    },
    {
      accessorKey: 'name',
      header: () => <span>Name</span>,
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
          <span className={`text-[13px] font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
            {status.name}
          </span>
        );
      },
    },
    {
      accessorKey: 'description',
      header: () => <span>Description</span>,
      cell: ({ row }) => {
        const status = row.original;
        if (editingId === status.id && editForm) {
          return (
            <Input
              value={editForm.description || ''}
              onChange={(e) => onEditChange({ ...editForm, description: e.target.value })}
              className={inputClass}
              placeholder="Optional description..."
            />
          );
        }
        return (
          <span className={`text-xs truncate max-w-[240px] block leading-relaxed ${
            isDark ? 'text-gray-500' : 'text-gray-400'
          }`}>
            {status.description || (
              <span className={`italic ${isDark ? 'text-gray-700' : 'text-gray-300'}`}>
                No description
              </span>
            )}
          </span>
        );
      },
    },
    {
      accessorKey: 'order',
      header: () => <span>Order</span>,
      cell: ({ row }) => {
        const status = row.original;
        if (editingId === status.id && editForm) {
          return (
            <Input
              type="number"
              min="0"
              value={editForm.order || 0}
              onChange={(e) => onEditChange({ ...editForm, order: parseInt(e.target.value) || 0 })}
              className={`w-20 text-center font-mono ${inputClass}`}
            />
          );
        }
        return (
          <span className={`text-[11px] font-mono tabular-nums ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {status.order ?? '—'}
          </span>
        );
      },
      size: 80,
    },
    {
      accessorKey: 'isFinalStatus',
      header: () => <span className="flex justify-center">Final</span>,
      cell: ({ row }) => {
        const status = row.original;
        if (editingId === status.id && editForm) {
          return (
            <div className="flex justify-center">
              <Checkbox
                checked={editForm.isFinalStatus || false}
                onCheckedChange={(checked) => onEditChange({ ...editForm, isFinalStatus: !!checked })}
                className={isDark ? 'border-gray-600 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500' : ''}
              />
            </div>
          );
        }
        return (
          <div className="flex justify-center">
            {status.isFinalStatus ? (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                isDark
                  ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                  : 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/60'
              }`}>
                <span className="w-1 h-1 rounded-full bg-current" />
                Final
              </span>
            ) : (
              <span className={`text-[10px] ${isDark ? 'text-gray-700' : 'text-gray-300'}`}>
                —
              </span>
            )}
          </div>
        );
      },
      size: 80,
    },
    {
      id: 'actions',
      header: () => <div className="flex justify-end">Actions</div>,
      cell: ({ row }) => {
        const status = row.original;
        const isEditing = editingId === status.id && editForm;

        return (
          <TooltipProvider delayDuration={200}>
            <div className={`flex items-center justify-end gap-1 transition-opacity ${
              isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}>
              {isEditing ? (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={onSave}
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-lg transition-all ${
                          isDark
                            ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'
                        }`}
                      >
                        <Check size={14} strokeWidth={2.5} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-[11px]">Save</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={onCancel}
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-lg transition-all ${
                          isDark
                            ? 'bg-white/[0.05] hover:bg-white/[0.1] text-gray-400'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-500'
                        }`}
                      >
                        <X size={14} strokeWidth={2.5} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-[11px]">Cancel</TooltipContent>
                  </Tooltip>
                </>
              ) : (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onEditClick(status)}
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-lg transition-all ${
                          isDark
                            ? 'hover:bg-white/[0.08] text-gray-500 hover:text-gray-300'
                            : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        <Pencil size={13} strokeWidth={2} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-[11px]">Edit</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onDelete(status.id)}
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-lg transition-all ${
                          isDark
                            ? 'hover:bg-rose-500/15 text-gray-500 hover:text-rose-400'
                            : 'hover:bg-rose-50 text-gray-400 hover:text-rose-500'
                        }`}
                      >
                        <Trash2 size={13} strokeWidth={2} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-[11px]">Delete</TooltipContent>
                  </Tooltip>
                </>
              )}
            </div>
          </TooltipProvider>
        );
      },
      size: 100,
    },
  ];
}