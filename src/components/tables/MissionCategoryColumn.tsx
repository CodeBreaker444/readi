'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MissionCategory } from '@/config/types/types';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';

interface GetColumnsOptions {
  isDark: boolean;
  onEditClick: (category: MissionCategory) => void;
  onDelete: (id: number) => void;
}

export function getMissionCategoryColumns({
  isDark,
  onEditClick,
  onDelete,
}: GetColumnsOptions): ColumnDef<MissionCategory>[] {
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
      accessorKey: 'name',
      header: () => <span>Name</span>,
      cell: ({ row }) => (
        <span className={`text-[13px] font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: 'description',
      header: () => <span>Description</span>,
      cell: ({ row }) => (
        <span className={`text-xs truncate max-w-[240px] block leading-relaxed ${
          isDark ? 'text-gray-500' : 'text-gray-400'
        }`}>
          {row.original.description || (
            <span className={`italic ${isDark ? 'text-gray-700' : 'text-gray-300'}`}>No description</span>
          )}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="flex justify-end">Actions</div>,
      cell: ({ row }) => {
        const category = row.original;
        return (
          <TooltipProvider delayDuration={200}>
            <div className="flex items-center justify-end gap-1 ">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onEditClick(category)}
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
                    onClick={() => onDelete(category.id)}
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
