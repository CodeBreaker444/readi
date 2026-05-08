'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Mission } from '@/config/types/types';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';

interface GetStatusColumnsOptions {
  isDark: boolean;
  onEditClick: (status: Mission) => void;
  onDelete: (id: number) => void;
  t: (key: string) => string;
}

export function createMissionStatusColumns({
  isDark,
  onEditClick,
  onDelete,
  t,
}: GetStatusColumnsOptions): ColumnDef<Mission>[] {
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
      header: () => <span>{t('missionStatus.table.colCode')}</span>,
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
      header: () => <span>{t('missionStatus.table.colName')}</span>,
      cell: ({ row }) => (
        <span className={`text-[13px] font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: 'description',
      header: () => <span>{t('missionStatus.table.colDescription')}</span>,
      cell: ({ row }) => (
        <span className={`text-xs truncate max-w-[240px] block leading-relaxed ${
          isDark ? 'text-gray-500' : 'text-gray-400'
        }`}>
          {row.original.description || (
            <span className={`italic ${isDark ? 'text-gray-700' : 'text-gray-300'}`}>
              {t('missionStatus.table.noDescription')}
            </span>
          )}
        </span>
      ),
    },
    {
      accessorKey: 'order',
      header: () => <span>{t('missionStatus.table.colOrder')}</span>,
      cell: ({ row }) => (
        <span className={`text-[11px] font-mono tabular-nums ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          {row.original.order ?? '—'}
        </span>
      ),
      size: 80,
    },
    {
      accessorKey: 'isFinalStatus',
      header: () => <span className="flex justify-center">{t('missionStatus.table.colFinal')}</span>,
      cell: ({ row }) => {
        const status = row.original;
        return (
          <div className="flex justify-center">
            {status.isFinalStatus ? (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                isDark
                  ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                  : 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/60'
              }`}>
                <span className="w-1 h-1 rounded-full bg-current" />
                {t('missionStatus.table.finalBadge')}
              </span>
            ) : (
              <span className={`text-[10px] ${isDark ? 'text-gray-700' : 'text-gray-300'}`}>—</span>
            )}
          </div>
        );
      },
      size: 80,
    },
    {
      id: 'actions',
      header: () => <div className="flex justify-end">{t('missionStatus.table.colActions')}</div>,
      cell: ({ row }) => {
        const status = row.original;
        return (
          <TooltipProvider delayDuration={200}>
            <div className="flex items-center justify-end gap-1">
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
                <TooltipContent side="top" className="text-[11px]">{t('common.edit')}</TooltipContent>
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
                <TooltipContent side="top" className="text-[11px]">{t('common.delete')}</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        );
      },
      size: 100,
    },
  ];
}
