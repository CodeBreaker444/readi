'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MissionResult } from '@/config/types/types';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';

interface GetMissionResultColumnsOptions {
  isDark: boolean;
  onEditClick: (result: MissionResult) => void;
  onDelete: (id: number) => void;
}

export function createMissionResultColumns({
  isDark,
  onEditClick,
  onDelete,
}: GetMissionResultColumnsOptions): ColumnDef<MissionResult>[] {
  const headerClass = `text-[11px] font-semibold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-400'}`;

  return [
    {
      accessorKey: 'id',
      header: () => <span className={headerClass}>#</span>,
      cell: ({ row }) => (
        <span className={`text-[11px] font-mono tabular-nums ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>
          {String(row.original.id).padStart(3, '0')}
        </span>
      ),
      size: 60,
    },
    {
      accessorKey: 'code',
      header: () => <span className={headerClass}>Code</span>,
      cell: ({ row }) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold tracking-wide ${
          isDark
            ? 'bg-white/[0.05] text-gray-300 ring-1 ring-white/[0.06]'
            : 'bg-gray-100 text-gray-600 ring-1 ring-gray-200/60'
        }`}>
          {row.original.code}
        </span>
      ),
    },
    {
      accessorKey: 'description',
      header: () => <span className={headerClass}>Description</span>,
      cell: ({ row }) => (
        <span className={`text-xs truncate max-w-[400px] block leading-relaxed ${isDark ? 'text-gray-500' : 'text-gray-400'}`} title={row.original.description}>
          {row.original.description || <span className={`italic ${isDark ? 'text-gray-700' : 'text-gray-300'}`}>—</span>}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="flex justify-end">Actions</div>,
      cell: ({ row }) => {
        const result = row.original;
        return (
          <TooltipProvider delayDuration={200}>
            <div className="flex items-center justify-end gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onEditClick(result)}
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
                    onClick={() => onDelete(result.id)}
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
            </div>
          </TooltipProvider>
        );
      },
      size: 100,
    },
  ];
}
