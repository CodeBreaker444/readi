'use client';

import { Input } from '@/components/ui/input';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { MissionType } from '@/config/types/types';
import { ColumnDef } from '@tanstack/react-table';
import { Check, Pencil, Trash2, X } from 'lucide-react';

interface GetMissionTypeColumnsOptions {
  isDark: boolean;
  editingId: number | null;
  editForm: MissionType | null;
  onEditChange: (form: MissionType) => void;
  onEditClick: (type: MissionType) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (id: number) => void;
}

export function getMissionTypeColumns({
  isDark,
  editingId,
  editForm,
  onEditChange,
  onEditClick,
  onSave,
  onCancel,
  onDelete,
}: GetMissionTypeColumnsOptions): ColumnDef<MissionType>[] {
  const inputClass = isDark
    ? 'bg-gray-900 border-gray-600 text-gray-100 focus-visible:ring-indigo-500 h-8 text-sm'
    : 'bg-white border-gray-300 text-gray-800 focus-visible:ring-indigo-400 h-8 text-sm';

  return [
    {
      accessorKey: 'id',
      header: () => (
        <span className={`text-[11px] font-semibold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
          #
        </span>
      ),
      cell: ({ row }) => (
        <span className={`text-xs px-2 py-0.5 rounded-md ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
          {String(row.original.id).padStart(3, '0')}
        </span>
      ),
    },
    {
      accessorKey: 'name',
      header: () => (
        <span className={`text-[11px] font-semibold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
          Name
        </span>
      ),
      cell: ({ row }) => {
        const type = row.original;
        if (editingId === type.id && editForm) {
          return (
            <Input
              value={editForm.name}
              onChange={e => onEditChange({ ...editForm, name: e.target.value })}
              className={inputClass}
            />
          );
        }
        return (
          <span className={`text-sm font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
            {type.name}
          </span>
        );
      },
    },
    {
      accessorKey: 'code',
      header: () => (
        <span className={`text-[11px] font-semibold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
          Code
        </span>
      ),
      cell: ({ row }) => {
        const type = row.original;
        if (editingId === type.id && editForm) {
          return (
            <Input
              value={editForm.code}
              onChange={e => onEditChange({ ...editForm, code: e.target.value.toUpperCase() })}
              className={`uppercase ${inputClass}`}
            />
          );
        }
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-widest border ${
            isDark
              ? 'bg-indigo-950/60 text-indigo-300 border-indigo-700/50'
              : 'bg-indigo-50 text-indigo-600 border-indigo-200'
          }`}>
            {type.code}
          </span>
        );
      },
    },
    {
      accessorKey: 'label',
      header: () => (
        <span className={`text-[11px] font-semibold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
          Label
        </span>
      ),
      cell: ({ row }) => {
        const type = row.original;
        if (editingId === type.id && editForm) {
          return (
            <Input
              value={editForm.label}
              onChange={e => onEditChange({ ...editForm, label: e.target.value })}
              className={inputClass}
            />
          );
        }
        return (
          <span
            className={`text-sm truncate max-w-[220px] block ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
            title={type.label}
          >
            {type.label || <span className="opacity-30 italic">—</span>}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: () => (
        <span className={`text-[11px] font-semibold uppercase tracking-widest flex justify-end ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
          Actions
        </span>
      ),
      cell: ({ row }) => {
        const type = row.original;
        const isEditing = editingId === type.id && editForm;

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
                        onClick={() => onEditClick(type)}
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
                        onClick={() => onDelete(type.id)}
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